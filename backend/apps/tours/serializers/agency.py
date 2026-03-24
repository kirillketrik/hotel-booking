from rest_framework import serializers

from apps.tours.models import Agency


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = (
            "id",
            "name",
            "description",
            "logo",
            "status",
            "rejection_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "rejection_reason",
            "created_at",
            "updated_at",
        )


class AgencyCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField()
    logo = serializers.ImageField(required=False)


class AgencyUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False)
    logo = serializers.ImageField(required=False)


class AgencyModerationSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)
