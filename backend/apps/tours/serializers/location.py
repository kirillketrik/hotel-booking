from rest_framework import serializers

from apps.tours.models import Location


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ("id", "country", "city", "latitude", "longitude")
