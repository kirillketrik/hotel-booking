from django.db import models

from apps.common.models import TimeStampedModel


class RoomType(TimeStampedModel):
    accommodation = models.ForeignKey(
        "accommodations.Accommodation",
        on_delete=models.CASCADE,
        related_name="room_types"
    )
    provider = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=100, verbose_name="Название типа")
    booking_url = models.URLField(max_length=1000)

