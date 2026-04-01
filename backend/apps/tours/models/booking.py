from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, TimeStampedModel
from apps.tours.enums.tour import BookingStatus


class Booking(BaseModel, TimeStampedModel):
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="bookings",
        verbose_name=_("User"),
    )
    tour = models.ForeignKey(
        "tours.Tour",
        on_delete=models.PROTECT,
        related_name="bookings",
        verbose_name=_("Tour"),
    )
    room = models.ForeignKey(
        "tours.HotelRoom",
        on_delete=models.PROTECT,
        related_name="bookings",
        null=True,
        blank=True,
        verbose_name=_("Room"),
    )
    room_count = models.PositiveIntegerField(
        default=1, verbose_name=_("Room Count")
    )
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING_PAYMENT,
        verbose_name=_("Status"),
    )
    adults_count = models.PositiveIntegerField(verbose_name=_("Adults"))
    children_count = models.PositiveIntegerField(
        default=0, verbose_name=_("Children")
    )
    special_requests = models.TextField(
        blank=True, verbose_name=_("Special Requests")
    )
    contact_phone = models.CharField(
        max_length=30, verbose_name=_("Contact Phone")
    )
    total_price = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name=_("Total Price")
    )
    stripe_payment_intent_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        verbose_name=_("Stripe Payment Intent ID"),
    )
    stripe_client_secret = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        verbose_name=_("Stripe Client Secret"),
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("Booking")
        verbose_name_plural = _("Bookings")

    def __str__(self) -> str:
        return f"Booking {self.pk} — {self.tour.title} ({self.status})"
