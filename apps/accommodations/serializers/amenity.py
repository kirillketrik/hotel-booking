from rest_framework import serializers

from apps.accommodations.models import AccommodationAmenity


class AccommodationAmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationAmenity
        fields = ["name"]
        read_only_fields = ["name"]
