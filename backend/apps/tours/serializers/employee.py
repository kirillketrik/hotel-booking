from rest_framework import serializers

from apps.tours.models import AgencyEmployee


class AgencyEmployeeSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_first_name = serializers.CharField(
        source="user.first_name", read_only=True
    )
    user_last_name = serializers.CharField(
        source="user.last_name", read_only=True
    )

    class Meta:
        model = AgencyEmployee
        fields = (
            "id",
            "user",
            "user_email",
            "user_first_name",
            "user_last_name",
            "role",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
