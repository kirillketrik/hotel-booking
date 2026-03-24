from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, TimeStampedModel
from apps.tours.enums.hotel import RoomType


class Amenity(BaseModel):
    name = models.CharField(
        max_length=100, unique=True, verbose_name=_("Name")
    )
    icon = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Icon"),
        help_text=_("Icon identifier for the frontend (e.g. 'wifi', 'pool')."),
    )

    class Meta:
        verbose_name = _("Amenity")
        verbose_name_plural = _("Amenities")
        ordering = ["name"]

    def __str__(self):
        return self.name


class Hotel(BaseModel, TimeStampedModel):
    tour = models.ForeignKey(
        "tours.Tour",
        on_delete=models.CASCADE,
        related_name="hotels",
        verbose_name=_("Tour"),
    )
    name = models.CharField(max_length=255, verbose_name=_("Name"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    stars = models.PositiveSmallIntegerField(
        verbose_name=_("Stars"),
        help_text=_("Hotel star rating (1–5)."),
    )
    amenities = models.ManyToManyField(
        Amenity,
        blank=True,
        related_name="hotels",
        verbose_name=_("Amenities"),
    )

    class Meta:
        verbose_name = _("Hotel")
        verbose_name_plural = _("Hotels")

    def __str__(self):
        return f"{self.name} ({self.stars}★)"


class HotelImage(BaseModel):
    hotel = models.ForeignKey(
        Hotel,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name=_("Hotel"),
    )
    image = models.ImageField(
        upload_to="hotels/images/", verbose_name=_("Image")
    )
    order = models.PositiveSmallIntegerField(
        default=0, verbose_name=_("Order")
    )

    class Meta:
        verbose_name = _("Hotel Image")
        verbose_name_plural = _("Hotel Images")
        ordering = ["order"]

    def __str__(self):
        return f"Image #{self.order} for {self.hotel}"


class HotelRoom(BaseModel):
    hotel = models.ForeignKey(
        Hotel,
        on_delete=models.CASCADE,
        related_name="rooms",
        verbose_name=_("Hotel"),
    )
    room_type = models.CharField(
        max_length=20,
        choices=RoomType.choices,
        verbose_name=_("Room Type"),
    )
    description = models.TextField(blank=True, verbose_name=_("Description"))
    price_per_night = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Price per Night"),
    )
    capacity = models.PositiveSmallIntegerField(verbose_name=_("Capacity"))
    quantity = models.PositiveSmallIntegerField(verbose_name=_("Quantity"))

    class Meta:
        verbose_name = _("Hotel Room")
        verbose_name_plural = _("Hotel Rooms")

    def __str__(self):
        return f"{self.get_room_type_display()} room at {self.hotel}"
