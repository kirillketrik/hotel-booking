from django.db.models import QuerySet

from apps.tours.models import Notification


def notification_list(*, user) -> QuerySet[Notification]:
    return Notification.objects.filter(recipient=user)
