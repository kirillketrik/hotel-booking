from django.db.models import QuerySet

from apps.tours.models import Agency


def agency_list_for_user(*, user) -> QuerySet[Agency]:
    return Agency.objects.filter(employees__user=user).distinct()


def agency_list_for_staff() -> QuerySet[Agency]:
    return Agency.objects.all()


def agency_list_public() -> QuerySet[Agency]:
    return Agency.objects.filter(status="approved")


def agency_get(*, pk) -> Agency:
    return Agency.objects.get(pk=pk)


# Backward-compatible aliases during the routing split.
def agency_list(*, user) -> QuerySet[Agency]:
    return agency_list_for_user(user=user)


def agency_list_all() -> QuerySet[Agency]:
    return agency_list_for_staff()


def agency_list_approved() -> QuerySet[Agency]:
    return agency_list_public()
