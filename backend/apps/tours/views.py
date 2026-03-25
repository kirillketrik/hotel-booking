import json

from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.tours.enums import EmployeeRole
from apps.tours.filters import TourFilter
from apps.tours.models import Agency, AgencyEmployee, Amenity, Invitation, Tour
from apps.tours.permissions import IsAgencyAdmin, IsAgencyMember, IsApprovedAgency
from apps.tours.selectors import (
    agency_list,
    employee_list,
    invitation_list,
    notification_list,
    tour_list,
)
from apps.tours.serializers import (
    AgencyCreateSerializer,
    AgencyEmployeeRoleSerializer,
    AgencyEmployeeSerializer,
    AgencyModerationSerializer,
    AgencySerializer,
    AgencyUpdateSerializer,
    AmenitySerializer,
    HotelInputSerializer,
    InvitationCreateSerializer,
    InvitationSerializer,
    NotificationSerializer,
    TourCreateSerializer,
    TourModerationSerializer,
    TourSerializer,
    TourUpdateSerializer,
)
from apps.tours.services import (
    agency_approve,
    agency_create,
    agency_reject,
    agency_update,
    invitation_accept,
    invitation_create,
    invitation_reject,
    tour_approve,
    tour_create,
    tour_reject,
    tour_update,
)


def _parse_multipart_fields(data, json_keys):
    """Parse JSON-string fields from multipart/form-data request.data."""
    result = data.dict() if hasattr(data, "dict") else dict(data)
    for key in json_keys:
        if key in result and isinstance(result[key], str):
            try:
                result[key] = json.loads(result[key])
            except (json.JSONDecodeError, ValueError):
                pass
    return result


class AgencyViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    def get_queryset(self):
        if self.request.user.is_staff:
            qs = Agency.objects.all()
        else:
            qs = agency_list(user=self.request.user)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return AgencyCreateSerializer
        if self.action == "partial_update":
            return AgencyUpdateSerializer
        if self.action in ("approve", "reject"):
            return AgencyModerationSerializer
        return AgencySerializer

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agency = agency_create(user=request.user, **serializer.validated_data)
        return Response(
            AgencySerializer(agency).data,
            status=status.HTTP_201_CREATED,
        )

    @action(methods=["patch"], detail=True, url_path="update")
    def partial_update_agency(self, request, pk=None):
        agency = get_object_or_404(Agency, pk=pk, employees__user=request.user)
        serializer = AgencyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agency = agency_update(agency=agency, **serializer.validated_data)
        return Response(AgencySerializer(agency).data)

    @action(methods=["post"], detail=True)
    def approve(self, request, pk=None):
        agency = get_object_or_404(Agency, pk=pk)
        agency = agency_approve(agency=agency)
        return Response(AgencySerializer(agency).data)

    @action(methods=["post"], detail=True)
    def reject(self, request, pk=None):
        agency = get_object_or_404(Agency, pk=pk)
        serializer = AgencyModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")
        agency = agency_reject(agency=agency, reason=reason)
        return Response(AgencySerializer(agency).data)


class AgencyEmployeeViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AgencyEmployeeSerializer
    permission_classes = [permissions.IsAuthenticated, IsAgencyAdmin, IsApprovedAgency]

    def get_queryset(self):
        agency_pk = self.kwargs["agency_pk"]
        agency = get_object_or_404(Agency, pk=agency_pk)
        return employee_list(agency=agency)

    def destroy(self, request, *args, **kwargs):
        from rest_framework.exceptions import ValidationError

        employee = self.get_object()
        if employee.role == EmployeeRole.OWNER:
            raise ValidationError("Cannot remove the agency owner.")
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(methods=["patch"], detail=True, url_path="role")
    def update_role(self, request, agency_pk=None, pk=None):
        from rest_framework.exceptions import ValidationError

        employee = self.get_object()
        if employee.role == EmployeeRole.OWNER:
            raise ValidationError("Cannot change the owner's role.")
        serializer = AgencyEmployeeRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee.role = serializer.validated_data["role"]
        employee.save(update_fields=["role"])
        return Response(AgencyEmployeeSerializer(employee).data)


class InvitationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated, IsAgencyAdmin, IsApprovedAgency]

    def get_serializer_class(self):
        if self.action == "create":
            return InvitationCreateSerializer
        return InvitationSerializer

    def get_queryset(self):
        agency_pk = self.kwargs["agency_pk"]
        agency = get_object_or_404(Agency, pk=agency_pk)
        return invitation_list(agency=agency)

    def destroy(self, request, *args, **kwargs):
        from rest_framework.exceptions import ValidationError

        invitation = self.get_object()
        if invitation.status != "pending":
            raise ValidationError("Only pending invitations can be deleted.")
        invitation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        agency_pk = self.kwargs["agency_pk"]
        agency = get_object_or_404(Agency, pk=agency_pk)
        created_by = get_object_or_404(
            AgencyEmployee, user=request.user, agency=agency
        )

        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError

        try:
            invitation = invitation_create(
                agency=agency,
                created_by=created_by,
                invited_email=serializer.validated_data.get("invited_email"),
                invited_user_id=serializer.validated_data.get("invited_user"),
                role=serializer.validated_data.get("role", "operator"),
                expires_at=serializer.validated_data.get("expires_at"),
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(
            InvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class InvitationRespondViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Handles retrieve/accept/reject for invitations identified by token.
    Available to any authenticated user — validation happens in the service.
    """

    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "token"

    def get_queryset(self):
        # List action → only the current user's received invitations
        if self.action == "list":
            return Invitation.objects.select_related("agency").filter(
                invited_user=self.request.user
            )
        return Invitation.objects.select_related("agency").all()

    @action(methods=["post"], detail=True)
    def accept(self, request, token=None):
        invitation = get_object_or_404(Invitation, token=token)
        from django.core.exceptions import (
            ValidationError as DjangoValidationError,
        )
        from rest_framework.exceptions import (
            ValidationError as DRFValidationError,
        )

        try:
            employee = invitation_accept(
                invitation=invitation, user=request.user
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(
            AgencyEmployeeSerializer(employee).data,
            status=status.HTTP_200_OK,
        )

    @action(methods=["post"], detail=True)
    def reject(self, request, token=None):
        invitation = get_object_or_404(Invitation, token=token)
        from django.core.exceptions import (
            ValidationError as DjangoValidationError,
        )
        from rest_framework.exceptions import (
            ValidationError as DRFValidationError,
        )

        try:
            invitation_reject(invitation=invitation, user=request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(status=status.HTTP_200_OK)


class TourViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TourFilter
    search_fields = [
        "title",
        "description",
        "location__country",
        "location__city",
    ]
    ordering_fields = ["price", "start_date", "created_at", "duration_days"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        approved_agency_only = not (user.is_authenticated and user.is_staff)
        agency_pk = self.kwargs.get("agency_pk")
        if agency_pk:
            return tour_list(
                agency=agency_pk, approved_agency_only=approved_agency_only
            )
        return tour_list(approved_agency_only=approved_agency_only)

    def get_serializer_class(self):
        if self.action == "create":
            return TourCreateSerializer
        if self.action == "partial_update_tour":
            return TourUpdateSerializer
        if self.action in ("approve", "reject"):
            return TourModerationSerializer
        return TourSerializer

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [permissions.IsAdminUser()]
        if self.action in ("create", "partial_update_tour"):
            return [permissions.IsAuthenticated(), IsAgencyMember(), IsApprovedAgency()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        agency_pk = self.kwargs["agency_pk"]
        agency = get_object_or_404(Agency, pk=agency_pk)
        created_by = get_object_or_404(
            AgencyEmployee, user=request.user, agency=agency
        )

        data = _parse_multipart_fields(
            request.data, ["location", "hotels", "transfers"]
        )
        serializer = TourCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        hotels = list(vd.get("hotels") or [])
        for idx, hotel in enumerate(hotels):
            hotel = dict(hotel)
            hotel["images"] = request.FILES.getlist(f"hotel_images_{idx}")
            hotels[idx] = hotel

        tour = tour_create(
            agency=agency,
            created_by=created_by,
            title=vd["title"],
            description=vd["description"],
            price=vd["price"],
            start_date=vd["start_date"],
            end_date=vd["end_date"],
            location_data=vd["location"],
            max_adults=vd["max_adults"],
            max_children=vd["max_children"],
            cover_image=vd.get("cover_image"),
            hotels=hotels,
            transfers=vd.get("transfers"),
        )
        return Response(
            TourSerializer(tour).data, status=status.HTTP_201_CREATED
        )

    @action(methods=["patch"], detail=True, url_path="update")
    def partial_update_tour(self, request, agency_pk=None, pk=None):
        tour = get_object_or_404(Tour, pk=pk, agency_id=agency_pk)

        data = _parse_multipart_fields(request.data, ["hotels"])
        hotels_raw = data.pop("hotels", None)

        hotels = None
        if hotels_raw is not None:
            hotel_serializer = HotelInputSerializer(
                data=hotels_raw, many=True
            )
            hotel_serializer.is_valid(raise_exception=True)
            hotels = []
            for idx, hotel in enumerate(hotel_serializer.validated_data):
                hotel = dict(hotel)
                hotel["images"] = request.FILES.getlist(
                    f"hotel_images_{idx}"
                )
                hotels.append(hotel)

        serializer = TourUpdateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        tour = tour_update(
            tour=tour, hotels=hotels, **serializer.validated_data
        )
        return Response(TourSerializer(tour).data)

    @action(methods=["post"], detail=True)
    def approve(self, request, agency_pk=None, pk=None):
        tour = get_object_or_404(Tour, pk=pk)
        tour = tour_approve(tour=tour)
        return Response(TourSerializer(tour).data)

    @action(methods=["post"], detail=True)
    def reject(self, request, agency_pk=None, pk=None):
        tour = get_object_or_404(Tour, pk=pk)
        serializer = TourModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")
        tour = tour_reject(tour=tour, reason=reason)
        return Response(TourSerializer(tour).data)


class AmenityViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = AmenitySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Amenity.objects.all()


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return notification_list(user=self.request.user)

    @action(methods=["post"], detail=True, url_path="read")
    def mark_read(self, request, pk=None):
        from apps.tours.models import Notification

        notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response(status=status.HTTP_200_OK)

    @action(methods=["post"], detail=False, url_path="read-all")
    def mark_all_read(self, request):
        notification_list(user=request.user).update(is_read=True)
        return Response(status=status.HTTP_200_OK)
