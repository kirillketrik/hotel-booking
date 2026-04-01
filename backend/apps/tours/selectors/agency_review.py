from django.db.models import QuerySet

from apps.tours.models import AgencyReview


def agency_review_list(*, agency) -> QuerySet[AgencyReview]:
    return (
        AgencyReview.objects.filter(agency=agency)
        .select_related("user")
        .order_by("-created_at")
    )
