from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, TimeStampedModel


class TourReview(BaseModel, TimeStampedModel):
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="tour_reviews",
        verbose_name=_("User"),
    )
    tour = models.ForeignKey(
        "tours.Tour",
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name=_("Tour"),
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_("Rating"),
    )
    comment = models.TextField(blank=True, verbose_name=_("Comment"))

    class Meta:
        verbose_name = _("Tour Review")
        verbose_name_plural = _("Tour Reviews")
        unique_together = [("user", "tour")]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Review by {self.user} for {self.tour} ({self.rating}/10)"
