from django.db import models


class ProviderOffer(models.Model):
    room_type = models.ForeignKey(
        "accommodations.RoomType",
        on_delete=models.CASCADE,
        related_name="offers"
    )

    adults = models.PositiveSmallIntegerField()
    children = models.PositiveSmallIntegerField(default=0)

    price_total = models.DecimalField(max_digits=12, decimal_places=2)

    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['adults', 'children', 'price_total']),
        ]