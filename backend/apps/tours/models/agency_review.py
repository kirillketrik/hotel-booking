from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, TimeStampedModel


class AgencyReview(BaseModel, TimeStampedModel):
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="agency_reviews",
        verbose_name=_("User"),
    )
    agency = models.ForeignKey(
        "tours.Agency",
        on_delete=models.CASCADE,
        related_name="agency_reviews",
        verbose_name=_("Agency"),
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        verbose_name=_("Rating"),
    )
    comment = models.TextField(blank=True, verbose_name=_("Comment"))

    class Meta:
        verbose_name = _("Agency Review")
        verbose_name_plural = _("Agency Reviews")
        unique_together = [("user", "agency")]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Review by {self.user} for {self.agency} ({self.rating}/10)"
