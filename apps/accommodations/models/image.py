from django.db import models

from apps.common.models import BaseModel


class AccommodationImage(BaseModel):
    accommodation = models.ForeignKey(
        to="accommodations.Accommodation",
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name="Объект размещения"
    )
    image = models.ImageField(
        upload_to="accommodations/images/",
        verbose_name="Фотография"
    )

    class Meta:
        verbose_name = "Фотография объекта"
        verbose_name_plural = "Фотографии объектов"
