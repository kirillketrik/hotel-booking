from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accommodations.models import AccommodationRating

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["first_name", "last_name"]


class AccommodationRatingSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AccommodationRating
        fields = "__all__"
        read_only_fields = ("id", "user", "accommodation")

