from rest_framework import serializers

from apps.tours.models import Invitation


class InvitationSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source="agency.name", read_only=True)
    invited_user_email = serializers.EmailField(
        source="invited_user.email", read_only=True, default=None
    )
    invited_user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = (
            "id",
            "agency",
            "agency_name",
            "invited_email",
            "invited_user",
            "invited_user_email",
            "invited_user_full_name",
            "role",
            "token",
            "status",
            "expires_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "agency",
            "agency_name",
            "token",
            "status",
            "created_at",
        )

    def get_invited_user_full_name(self, obj) -> str | None:
        if not obj.invited_user:
            return None
        parts = [obj.invited_user.first_name, obj.invited_user.last_name]
        return " ".join(p for p in parts if p) or None


class InvitationCreateSerializer(serializers.Serializer):
    invited_email = serializers.EmailField(required=False, allow_null=True)
    invited_user = serializers.UUIDField(required=False, allow_null=True)
    role = serializers.ChoiceField(
        choices=["admin", "operator"], default="operator"
    )
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
