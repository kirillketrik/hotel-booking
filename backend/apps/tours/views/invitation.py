from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.response import Response

from apps.tours.models import Agency, AgencyEmployee
from apps.tours.permissions import IsAgencyAdmin, IsApprovedAgency
from apps.tours.selectors import invitation_list
from apps.tours.serializers import InvitationCreateSerializer, InvitationSerializer
from apps.tours.services import invitation_create


class InvitationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [permissions.IsAuthenticated, IsAgencyAdmin, IsApprovedAgency]

    def get_serializer_class(self):
        if self.action == "create":
            return InvitationCreateSerializer
        return InvitationSerializer

    def get_queryset(self):
        agency_pk = self.kwargs["agency_pk"]
        agency = get_object_or_404(Agency, pk=agency_pk)
        return invitation_list(agency=agency)

    def destroy(self, request, *args, **kwargs):
        from rest_framework.exceptions import ValidationError

        invitation = self.get_object()
        if invitation.status != "pending":
            raise ValidationError("Only pending invitations can be deleted.")
        invitation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError

        agency_pk = self.kwargs["agency_pk"]
        agency = get_object_or_404(Agency, pk=agency_pk)
        created_by = get_object_or_404(
            AgencyEmployee, user=request.user, agency=agency
        )

        serializer = InvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            invitation = invitation_create(
                agency=agency,
                created_by=created_by,
                invited_email=serializer.validated_data.get("invited_email"),
                invited_user_id=serializer.validated_data.get("invited_user"),
                role=serializer.validated_data.get("role", "operator"),
                expires_at=serializer.validated_data.get("expires_at"),
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(
            InvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED,
        )
