from rest_framework import serializers

from apps.tours.models import AgencyReview


class AgencyReviewSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AgencyReview
        fields = ("id", "user_id", "user_name", "rating", "comment", "created_at", "updated_at")
        read_only_fields = ("id", "user_id", "user_name", "created_at", "updated_at")

    def get_user_name(self, obj) -> str:
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email


class AgencyReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=0, max_value=10)
    comment = serializers.CharField(required=False, allow_blank=True, default="")
