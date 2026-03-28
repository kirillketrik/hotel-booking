from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, TimeStampedModel
from apps.tours.enums.tour import TourStatus, TransferType


class Tour(BaseModel, TimeStampedModel):
    agency = models.ForeignKey(
        "tours.Agency",
        on_delete=models.PROTECT,
        related_name="tours",
        verbose_name=_("Agency"),
    )
    created_by = models.ForeignKey(
        "tours.AgencyEmployee",
        on_delete=models.PROTECT,
        related_name="created_tours",
        verbose_name=_("Created By"),
    )
    title = models.CharField(max_length=255, verbose_name=_("Title"))
    description = models.TextField(verbose_name=_("Description"))
    cover_image = models.ImageField(
        upload_to="tours/covers/",
        null=True,
        blank=True,
        verbose_name=_("Cover Image"),
    )
    price = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name=_("Price")
    )
    start_date = models.DateField(verbose_name=_("Start Date"))
    end_date = models.DateField(verbose_name=_("End Date"))
    duration_days = models.PositiveIntegerField(
        verbose_name=_("Duration (days)")
    )
    location = models.ForeignKey(
        "tours.Location",
        on_delete=models.PROTECT,
        related_name="tours",
        verbose_name=_("Location"),
    )
    max_adults = models.PositiveIntegerField(verbose_name=_("Max Adults"))
    max_children = models.PositiveIntegerField(verbose_name=_("Max Children"))
    status = models.CharField(
        max_length=20,
        choices=TourStatus.choices,
        default=TourStatus.PENDING,
        verbose_name=_("Status"),
    )
    rejection_reason = models.TextField(
        blank=True, verbose_name=_("Rejection Reason")
    )

    class Meta:
        verbose_name = _("Tour")
        verbose_name_plural = _("Tours")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.agency})"


class TourImage(BaseModel):
    tour = models.ForeignKey(
        Tour,
        on_delete=models.CASCADE,
        related_name="images",
        verbose_name=_("Tour"),
    )
    image = models.ImageField(
        upload_to="tours/images/", verbose_name=_("Image")
    )
    order = models.PositiveSmallIntegerField(
        default=0, verbose_name=_("Order")
    )

    class Meta:
        verbose_name = _("Tour Image")
        verbose_name_plural = _("Tour Images")
        ordering = ["order"]

    def __str__(self):
        return f"Image #{self.order} for {self.tour}"


class TourTransfer(BaseModel):
    tour = models.ForeignKey(
        Tour,
        on_delete=models.CASCADE,
        related_name="transfers",
        verbose_name=_("Tour"),
    )
    transfer_type = models.CharField(
        max_length=20,
        choices=TransferType.choices,
        verbose_name=_("Transfer Type"),
    )
    description = models.TextField(blank=True, verbose_name=_("Description"))
    price = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name=_("Price")
    )
    is_included = models.BooleanField(
        default=False, verbose_name=_("Is Included")
    )

    class Meta:
        verbose_name = _("Tour Transfer")
        verbose_name_plural = _("Tour Transfers")

    def __str__(self):
        included = "included" if self.is_included else "extra"
        return (
            f"{self.get_transfer_type_display()} transfer "
            f"({included}) for {self.tour}"
        )


class Wishlist(BaseModel, TimeStampedModel):
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="wishlist_items",
        verbose_name=_("User"),
    )
    tour = models.ForeignKey(
        Tour,
        on_delete=models.CASCADE,
        related_name="wishlisted_by",
        verbose_name=_("Tour"),
    )

    class Meta:
        verbose_name = _("Wishlist Item")
        verbose_name_plural = _("Wishlist Items")
        unique_together = [("user", "tour")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.tour}"
