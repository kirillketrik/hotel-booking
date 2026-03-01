from rest_framework import serializers

from apps.accommodations.models import AccommodationImage


class AccommodationImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationImage
        fields = ["id", "image"]
