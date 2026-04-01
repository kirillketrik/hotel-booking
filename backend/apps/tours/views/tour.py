import json

from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.tours.filters import TourFilter
from apps.tours.models import Agency, AgencyEmployee, Tour
from apps.tours.permissions import IsAgencyAdminOrStaff, IsAgencyMember, IsApprovedAgency
from apps.tours.selectors import (
    booking_get_used_capacity,
    booking_list_room_usage,
    hotel_room_list_for_tour,
    tour_list,
)
from apps.tours.serializers import (
    BookingCreateResponseSerializer,
    BookingCreateSerializer,
    HotelInputSerializer,
    TourCreateSerializer,
    TourModerationSerializer,
    TourSerializer,
    TourUpdateSerializer,
)
from apps.tours.services import (
    booking_create,
    tour_approve,
    tour_create,
    tour_delete,
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


class TourViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
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
        is_staff = user.is_authenticated and user.is_staff
        agency_pk = self.kwargs.get("agency_pk")

        if agency_pk:
            # Agency-scoped view: show all tours to members/staff
            return tour_list(
                agency=agency_pk,
                approved_agency_only=not is_staff,
            )

        # Public catalog: only upcoming, approved tours from approved agencies
        qs = tour_list(
            approved_agency_only=True,
            status="approved",
            upcoming_only=True,
        )
        if self.action in ("book", "availability"):
            return qs
        return qs

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
        if self.action == "destroy":
            return [permissions.IsAuthenticated(), IsAgencyAdminOrStaff()]
        return [permissions.AllowAny()]

    def perform_destroy(self, instance):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError
        try:
            tour_delete(tour=instance)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc

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
            images=request.FILES.getlist("tour_images"),
        )
        return Response(
            TourSerializer(tour).data, status=status.HTTP_201_CREATED
        )

    @action(methods=["patch"], detail=True, url_path="update")
    def partial_update_tour(self, request, agency_pk=None, pk=None):
        tour = get_object_or_404(Tour, pk=pk, agency_id=agency_pk)

        data = _parse_multipart_fields(
            request.data, ["hotels", "existing_tour_image_ids"]
        )
        hotels_raw = data.pop("hotels", None)
        existing_tour_image_ids = data.pop("existing_tour_image_ids", None)

        hotels = None
        if hotels_raw is not None:
            hotel_serializer = HotelInputSerializer(data=hotels_raw, many=True)
            hotel_serializer.is_valid(raise_exception=True)
            hotels = []
            for idx, hotel in enumerate(hotel_serializer.validated_data):
                hotel = dict(hotel)
                hotel["images"] = request.FILES.getlist(f"hotel_images_{idx}")
                hotels.append(hotel)

        serializer = TourUpdateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        tour = tour_update(
            tour=tour,
            hotels=hotels,
            new_images=request.FILES.getlist("tour_images"),
            existing_tour_image_ids=existing_tour_image_ids,
            **serializer.validated_data,
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

    @action(
        methods=["post"],
        detail=False,
        url_path="import",
        permission_classes=[permissions.IsAuthenticated, IsAgencyMember, IsApprovedAgency],
    )
    def import_csv(self, request, agency_pk=None):
        from rest_framework.exceptions import ValidationError as DRFValidationError

        from apps.tours.tasks import tour_bulk_import_task

        agency = get_object_or_404(Agency, pk=agency_pk)
        created_by = get_object_or_404(
            AgencyEmployee, user=request.user, agency=agency
        )

        csv_file = request.FILES.get("file")
        if not csv_file:
            raise DRFValidationError({"file": "No file provided."})
        if not csv_file.name.endswith(".csv"):
            raise DRFValidationError({"file": "File must have a .csv extension."})

        try:
            csv_text = csv_file.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            raise DRFValidationError({"file": "File must be UTF-8 encoded."})

        task = tour_bulk_import_task.delay(
            agency_id=str(agency.pk),
            employee_id=str(created_by.pk),
            csv_text=csv_text,
            requester_id=str(request.user.pk),
        )
        return Response({"task_id": task.id}, status=status.HTTP_202_ACCEPTED)

    @action(
        methods=["get"],
        detail=False,
        url_path="import/(?P<task_id>[^/.]+)/status",
        permission_classes=[permissions.IsAuthenticated, IsAgencyMember],
    )
    def import_status(self, request, agency_pk=None, task_id=None):
        from celery.result import AsyncResult

        result = AsyncResult(task_id)
        if result.state == "PENDING":
            return Response({"state": "pending"})
        if result.state == "FAILURE":
            return Response({"state": "failure", "error": str(result.result)})
        if result.state == "SUCCESS":
            return Response({"state": "success", "result": result.result})
        return Response({"state": result.state.lower()})

    @action(
        methods=["post"],
        detail=True,
        url_path="book",
        permission_classes=[permissions.IsAuthenticated],
    )
    def book(self, request, agency_pk=None, pk=None):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError

        tour = self.get_object()
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = booking_create(
                user=request.user,
                tour=tour,
                **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(
            BookingCreateResponseSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        methods=["get"],
        detail=True,
        url_path="availability",
        permission_classes=[permissions.AllowAny],
    )
    def availability(self, request, agency_pk=None, pk=None):
        tour = self.get_object()

        used = booking_get_used_capacity(tour=tour)
        available_adults = tour.max_adults - (used["used_adults"] or 0)
        available_children = tour.max_children - (used["used_children"] or 0)
        is_fully_booked = available_adults <= 0

        rooms_qs = hotel_room_list_for_tour(tour=tour)
        used_by_room = {
            str(rb["room_id"]): rb["used"]
            for rb in booking_list_room_usage(tour=tour)
        }

        rooms = []
        for room in rooms_qs:
            used_count = used_by_room.get(str(room.pk), 0)
            available_quantity = room.quantity - used_count
            rooms.append({
                "id": str(room.pk),
                "room_type": room.room_type,
                "description": room.description,
                "price_per_night": str(room.price_per_night),
                "capacity": room.capacity,
                "quantity": room.quantity,
                "available_quantity": max(available_quantity, 0),
            })

        return Response({
            "available_adults": max(available_adults, 0),
            "available_children": max(available_children, 0),
            "is_fully_booked": is_fully_booked,
            "rooms": rooms,
        })
