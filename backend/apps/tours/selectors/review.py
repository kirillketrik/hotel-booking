from django.db.models import QuerySet

from apps.tours.models import TourReview


def review_list_for_tour(*, tour) -> QuerySet[TourReview]:
    return (
        TourReview.objects.filter(tour=tour)
        .select_related("user")
        .order_by("-created_at")
    )
