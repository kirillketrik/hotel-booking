from django.db.models import IntegerField, OuterRef, QuerySet, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.tours.enums import AgencyStatus, TourStatus
from apps.tours.models import Booking, Tour


def _availability_annotations():
    """Return annotation kwargs for used adult/children counts."""
    active = ["paid", "confirmed"]
    used_adults = Subquery(
        Booking.objects.filter(tour=OuterRef("pk"), status__in=active)
        .values("tour")
        .annotate(s=Sum("adults_count"))
        .values("s"),
        output_field=IntegerField(),
    )
    used_children = Subquery(
        Booking.objects.filter(tour=OuterRef("pk"), status__in=active)
        .values("tour")
        .annotate(s=Sum("children_count"))
        .values("s"),
        output_field=IntegerField(),
    )
    return {
        "used_adults": Coalesce(used_adults, 0),
        "used_children": Coalesce(used_children, 0),
    }


def _tour_base_queryset(*, include_availability: bool) -> QuerySet[Tour]:
    qs = Tour.objects.select_related(
        "agency", "location", "created_by__user"
    ).prefetch_related(
        "images",
        "transfers",
        "hotels__images",
        "hotels__rooms",
        "hotels__amenities",
    )
    if include_availability:
        qs = qs.annotate(**_availability_annotations())
    return qs


def tour_list(
    *,
    agency=None,
    status: str | None = None,
    approved_agency_only: bool = False,
    upcoming_only: bool = False,
    is_staff: bool = False,
) -> QuerySet[Tour]:
    qs = _tour_base_queryset(include_availability=not is_staff)
    if agency is not None:
        qs = qs.filter(agency=agency)
    if status is not None:
        qs = qs.filter(status=status)
    if approved_agency_only:
        qs = qs.filter(agency__status=AgencyStatus.APPROVED)
    if upcoming_only:
        qs = qs.filter(start_date__gte=timezone.now().date())
    return qs


def tour_list_public() -> QuerySet[Tour]:
    return tour_list(
        approved_agency_only=True,
        status=TourStatus.APPROVED,
        upcoming_only=True,
        is_staff=False,
    )


def tour_list_for_staff() -> QuerySet[Tour]:
    return _tour_base_queryset(include_availability=False)


def tour_list_for_agency(
    *,
    agency,
    include_all_statuses: bool,
    is_staff: bool = False,
) -> QuerySet[Tour]:
    return tour_list(
        agency=agency,
        status=None if include_all_statuses else TourStatus.APPROVED,
        approved_agency_only=not include_all_statuses,
        is_staff=is_staff,
    )


def tour_get(*, pk) -> Tour:
    return (
        Tour.objects.select_related("agency", "location", "created_by__user")
        .prefetch_related(
            "images",
            "transfers",
            "hotels__images",
            "hotels__rooms",
            "hotels__amenities",
        )
        .annotate(**_availability_annotations())
        .get(pk=pk)
    )
