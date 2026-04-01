from django.db.models import IntegerField, OuterRef, QuerySet, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.tours.enums import AgencyStatus
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


def tour_list(
    *,
    agency=None,
    status: str | None = None,
    approved_agency_only: bool = False,
    upcoming_only: bool = False,
) -> QuerySet[Tour]:
    qs = Tour.objects.select_related(
        "agency", "location", "created_by__user"
    ).prefetch_related(
        "images",
        "transfers",
        "hotels__images",
        "hotels__rooms",
        "hotels__amenities",
    ).annotate(**_availability_annotations())
    if agency is not None:
        qs = qs.filter(agency=agency)
    if status is not None:
        qs = qs.filter(status=status)
    if approved_agency_only:
        qs = qs.filter(agency__status=AgencyStatus.APPROVED)
    if upcoming_only:
        qs = qs.filter(start_date__gte=timezone.now().date())
    return qs


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
