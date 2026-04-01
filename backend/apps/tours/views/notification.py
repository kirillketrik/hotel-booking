from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tours.models import Notification
from apps.tours.selectors import notification_list
from apps.tours.serializers import NotificationSerializer


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return notification_list(user=self.request.user)

    @action(methods=["post"], detail=True, url_path="read")
    def mark_read(self, request, pk=None):
        notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response(status=status.HTTP_200_OK)

    @action(methods=["post"], detail=False, url_path="read-all")
    def mark_all_read(self, request):
        notification_list(user=request.user).update(is_read=True)
        return Response(status=status.HTTP_200_OK)
