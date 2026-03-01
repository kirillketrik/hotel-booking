from typing import TYPE_CHECKING

from computedfields.models import computed, ComputedFieldsModel
from django.db import models

from apps.accommodations.enums import AccommodationType
from apps.common.models import BaseModel, TimeStampedModel

if TYPE_CHECKING:
    from django.db.models.fields.related_descriptors import RelatedManager
    from .rating import AccommodationRating
    from .image import AccommodationImage
    from .room_type import RoomType


class Accommodation(BaseModel, TimeStampedModel, ComputedFieldsModel):
    title = models.CharField(max_length=255, verbose_name="Название")
    category = models.CharField(
        max_length=10,
        choices=AccommodationType.choices,
        verbose_name="Тип объекта"
    )
    description = models.TextField(verbose_name="Описание", blank=True, default="")
    amenities = models.ManyToManyField(
        to="accommodations.AccommodationAmenity",
        related_name="accommodations",
        verbose_name="Удобства"
    )
    min_price = models.DecimalField()
    booking_url = models.URLField()

    if TYPE_CHECKING:
        ratings: RelatedManager["AccommodationRating"]
        images: RelatedManager["AccommodationImage"]
        room_types: RelatedManager["RoomType"]

    @computed(
        field=models.FloatField(default=0),
        depends=[("ratings", ["rating"])],
        prefetch_related=["ratings"]
    )
    def rating(self):
        if not self.pk:
            return 0

        count = self.ratings.all().count() or 1

        total = sum(r.rating for r in self.ratings.all())
        return round(total / count, 2)

    @computed(
        field=models.IntegerField(default=0),
        depends=[("ratings", ["id"])],
        prefetch_related=["ratings"]
    )
    def reviews_count(self):
        return self.ratings.count()

    class Meta:
        verbose_name = "Объект для размещения"
        verbose_name_plural = "Объекты для размещения"

    def __str__(self):
        return self.title
