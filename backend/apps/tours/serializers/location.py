from rest_framework import serializers

from apps.tours.models import Location


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ("id", "country", "city", "latitude", "longitude")
        # unique_together is enforced at the DB level and handled via
        # get_or_create in the service — remove the auto-generated validator
        # so submitting an existing (country, city) pair doesn't fail.
        validators = []
