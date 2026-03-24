from django.db import models


class RoomType(models.TextChoices):
    STANDARD = "standard", "Standard"
    DELUXE = "deluxe", "Deluxe"
    SUITE = "suite", "Suite"
    FAMILY = "family", "Family"
    ECONOMY = "economy", "Economy"
