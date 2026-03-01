from django.conf import settings
from django.db import models

from apps.common.models import BaseModel, TimeStampedModel


class AccommodationRating(BaseModel, TimeStampedModel):
    accommodation = models.ForeignKey(
        to="accommodations.Accommodation",
        on_delete=models.CASCADE,
        related_name="ratings",
        verbose_name="Объект размещения"
    )
    user = models.ForeignKey(
        to=settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ratings",
        verbose_name="Пользователь"
    )
    comment = models.CharField(
        max_length=1000,
        blank=True,
        default="",
        verbose_name="Комментарий"
    )
    rating = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Рейтинг"
    )

    class Meta:
        verbose_name = "Оценка объекта"
        verbose_name_plural = "Оценки объектов"
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'accommodation'],
                name='unique_user_accommodation_rating'
            )
        ]
