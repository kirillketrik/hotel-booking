from django.db.models import QuerySet

from apps.accommodations.models import Accommodation


class AccommodationService:
    @staticmethod
    def get_queryset() -> QuerySet[Accommodation]:
        return Accommodation.objects.all()
