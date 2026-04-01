from django.db.models import QuerySet, Sum

from apps.tours.enums import BookingStatus
from apps.tours.models import Booking

_ACTIVE_STATUSES = [BookingStatus.PAID, BookingStatus.CONFIRMED]


def booking_list_for_agency(*, agency) -> QuerySet[Booking]:
    return (
        Booking.objects.filter(tour__agency=agency)
        .select_related("tour__location", "tour__agency", "user")
        .order_by("-created_at")
    )


def booking_list_for_user(*, user) -> QuerySet[Booking]:
    return (
        Booking.objects.filter(user=user)
        .select_related("tour__location", "tour__agency")
        .prefetch_related("tour__images")
        .order_by("-created_at")
    )


def booking_get_used_capacity(*, tour) -> dict:
    return Booking.objects.filter(
        tour=tour, status__in=_ACTIVE_STATUSES
    ).aggregate(
        used_adults=Sum("adults_count"),
        used_children=Sum("children_count"),
    )


def booking_list_room_usage(*, tour) -> QuerySet:
    return (
        Booking.objects.filter(
            tour=tour, room__isnull=False, status__in=_ACTIVE_STATUSES
        )
        .values("room_id")
        .annotate(used=Sum("room_count"))
    )
