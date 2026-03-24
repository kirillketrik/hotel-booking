from rest_framework import serializers

from apps.tours.models import Invitation


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = (
            "id",
            "invited_email",
            "invited_user",
            "token",
            "status",
            "expires_at",
            "created_at",
        )
        read_only_fields = ("id", "token", "status", "created_at")


class InvitationCreateSerializer(serializers.Serializer):
    invited_email = serializers.EmailField(required=False, allow_null=True)
    invited_user = serializers.UUIDField(required=False, allow_null=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
