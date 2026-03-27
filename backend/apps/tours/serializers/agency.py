from rest_framework import serializers

from apps.tours.models import Agency, AgencyEmployee


class AgencySerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Agency
        fields = (
            "id",
            "name",
            "description",
            "logo",
            "status",
            "rejection_reason",
            "my_role",
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

    def get_my_role(self, obj) -> str | None:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        try:
            return AgencyEmployee.objects.get(
                agency=obj, user=request.user
            ).role
        except AgencyEmployee.DoesNotExist:
            return None


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
