from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tours.models import Invitation
from apps.tours.selectors import invitation_get_all, invitation_list_for_user
from apps.tours.serializers import AgencyEmployeeSerializer, InvitationSerializer
from apps.tours.services import invitation_accept, invitation_reject


class InvitationRespondViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Handles retrieve/accept/reject for invitations identified by token.
    Available to any authenticated user — validation happens in the service.
    """

    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "token"

    def get_queryset(self):
        if self.action == "list":
            return invitation_list_for_user(user=self.request.user)
        return invitation_get_all()

    @action(methods=["post"], detail=True)
    def accept(self, request, token=None):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError

        invitation = get_object_or_404(Invitation, token=token)
        try:
            employee = invitation_accept(invitation=invitation, user=request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(
            AgencyEmployeeSerializer(employee).data,
            status=status.HTTP_200_OK,
        )

    @action(methods=["post"], detail=True)
    def reject(self, request, token=None):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError

        invitation = get_object_or_404(Invitation, token=token)
        try:
            invitation_reject(invitation=invitation, user=request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(status=status.HTTP_200_OK)
