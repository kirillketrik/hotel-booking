from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.tours.filters import TourFilter
from apps.tours.models import Agency, AgencyEmployee, Invitation, Tour
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
    AgencyEmployeeSerializer,
    AgencyModerationSerializer,
    AgencySerializer,
    AgencyUpdateSerializer,
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


class AgencyViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    def get_queryset(self):
        if self.request.user.is_staff:
            return Agency.objects.all()
        return agency_list(user=self.request.user)

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
        employee = self.get_object()
        # Prevent removing the last admin
        agency = employee.agency
        if (
            employee.role == "admin"
            and not agency.employees.filter(role="admin")
            .exclude(pk=employee.pk)
            .exists()
        ):
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "Cannot remove the last admin of the agency."
            )
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvitationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
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

    def create(self, request, *args, **kwargs):
        agency_pk = self.kwargs["agency_pk"]
        agency = get_object_or_404(Agency, pk=agency_pk)
        created_by = get_object_or_404(
            AgencyEmployee, user=request.user, agency=agency
        )

        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invited_user = None
        if serializer.validated_data.get("invited_user"):
            from django.contrib.auth import get_user_model

            User = get_user_model()
            invited_user = get_object_or_404(
                User, pk=serializer.validated_data["invited_user"]
            )

        invitation = invitation_create(
            agency=agency,
            created_by=created_by,
            invited_email=serializer.validated_data.get("invited_email"),
            invited_user=invited_user,
            expires_at=serializer.validated_data.get("expires_at"),
        )
        return Response(
            InvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )


class InvitationRespondViewSet(viewsets.GenericViewSet):
    """
    Handles accept/reject for invitations identified by token.
    Available to any authenticated user — validation happens in the service.
    """

    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "token"
    queryset = Invitation.objects.all()

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

        serializer = TourCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tour = tour_create(
            agency=agency,
            created_by=created_by,
            title=data["title"],
            description=data["description"],
            price=data["price"],
            start_date=data["start_date"],
            end_date=data["end_date"],
            location_data=data["location"],
            max_adults=data["max_adults"],
            max_children=data["max_children"],
            cover_image=data.get("cover_image"),
            hotels=data.get("hotels"),
            transfers=data.get("transfers"),
        )
        return Response(
            TourSerializer(tour).data, status=status.HTTP_201_CREATED
        )

    @action(methods=["patch"], detail=True, url_path="update")
    def partial_update_tour(self, request, agency_pk=None, pk=None):
        tour = get_object_or_404(Tour, pk=pk, agency_id=agency_pk)
        serializer = TourUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tour = tour_update(tour=tour, **serializer.validated_data)
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
