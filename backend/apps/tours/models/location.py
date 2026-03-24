from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel


class Location(BaseModel):
    country = models.CharField(max_length=100, verbose_name=_("Country"))
    city = models.CharField(max_length=100, verbose_name=_("City"))
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_("Latitude"),
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_("Longitude"),
    )

    class Meta:
        verbose_name = _("Location")
        verbose_name_plural = _("Locations")
        unique_together = ("country", "city")

    def __str__(self):
        return f"{self.city}, {self.country}"
