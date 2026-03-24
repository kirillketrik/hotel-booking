from django.db.models import QuerySet

from apps.tours.enums import AgencyStatus
from apps.tours.models import (
    Agency,
    AgencyEmployee,
    Invitation,
    Tour,
)


def agency_list(*, user) -> QuerySet[Agency]:
    return Agency.objects.filter(employees__user=user).distinct()


def agency_get(*, pk) -> Agency:
    return Agency.objects.get(pk=pk)


def employee_list(*, agency) -> QuerySet[AgencyEmployee]:
    return AgencyEmployee.objects.filter(agency=agency).select_related("user")


def invitation_list(*, agency) -> QuerySet[Invitation]:
    return Invitation.objects.filter(agency=agency).select_related(
        "invited_user", "created_by__user"
    )


def tour_list(
    *,
    agency=None,
    status: str | None = None,
    approved_agency_only: bool = False,
) -> QuerySet[Tour]:
    qs = Tour.objects.select_related(
        "agency", "location", "created_by__user"
    ).prefetch_related(
        "images",
        "transfers",
        "hotels__images",
        "hotels__rooms",
        "hotels__amenities",
    )
    if agency is not None:
        qs = qs.filter(agency=agency)
    if status is not None:
        qs = qs.filter(status=status)
    if approved_agency_only:
        qs = qs.filter(agency__status=AgencyStatus.APPROVED)
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
        .get(pk=pk)
    )


def notification_list(*, user) -> QuerySet:
    from apps.tours.models import Notification

    return Notification.objects.filter(recipient=user)
