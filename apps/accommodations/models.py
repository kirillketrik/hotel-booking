from django.db import models

from apps.accommodations.enums import AccommodationTypes
from apps.common.models import BaseModel

from django.conf import settings


class AccommodationRating(BaseModel):
    accommodation = models.ForeignKey(
        to="accommodations.Accommodation",
        on_delete=models.CASCADE,
        related_name="ratings"
    )
    user = models.ForeignKey(
        to=settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ratings"
    )
    comment = models.CharField(
        max_length=1000,
        blank=True,
        default="",
    )
    rating = models.PositiveSmallIntegerField(
        default=0
    )


class Accommodation(BaseModel):
    title = models.CharField(max_length=255, verbose_name="Название")
    category = models.CharField(
        max_length=10,
        choices=AccommodationTypes.choices,
        verbose_name="Тип объекта"
    )
    description = models.TextField(verbose_name="Описание", blank=True, default="")

