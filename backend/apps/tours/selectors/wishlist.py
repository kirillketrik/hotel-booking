from django.db.models import QuerySet

from apps.tours.models import Tour, Wishlist


def wishlist_tour_list(*, user) -> QuerySet[Tour]:
    tour_ids = Wishlist.objects.filter(user=user).values_list("tour_id", flat=True)
    return Tour.objects.filter(pk__in=tour_ids, status="approved")
