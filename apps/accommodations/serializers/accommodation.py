from rest_framework import serializers

from apps.accommodations.models import Accommodation

from .image import AccommodationImageSerializer
from .amenity import AccommodationAmenitySerializer


class AccommodationSerializer(serializers.ModelSerializer):
    images = AccommodationImageSerializer(many=True)
    amenities = AccommodationAmenitySerializer(many=True)

    class Meta:
        model = Accommodation
        fields = '__all__'
        read_only_fields = (
            "id",
            "user",
            "is_published",
            "rating",
        )
