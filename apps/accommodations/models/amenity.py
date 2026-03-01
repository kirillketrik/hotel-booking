from django.db import models

from apps.common.models import BaseModel


class AccommodationAmenity(BaseModel):
    name = models.CharField(max_length=64, verbose_name="Название", db_index=True, unique=True)

    class Meta:
        verbose_name = "Удобство"
        verbose_name_plural = "Удобства"

    def __str__(self):
        return self.name
