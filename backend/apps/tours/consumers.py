from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Per-user WebSocket consumer for real-time notifications.

    Connect:  ws://host/ws/notifications/
    Auth:     JWT access_token cookie (handled by WebSocketJWTAuthMiddleware)

    Server → client messages:
      {"type": "unread_count", "count": N}
      {"type": "notification", "id": "...", "title": "...",
       "message": "...", "notification_type": "..."}

    Client → server messages:
      {"action": "mark_read",     "id": "<notification-uuid>"}
      {"action": "mark_all_read"}
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return

        self.group_name = f"notifications_user_{user.pk}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        count = await self._unread_count(user)
        await self.send_json({"type": "unread_count", "count": count})

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    async def receive_json(self, content, **kwargs):
        action = content.get("action")
        user = self.scope["user"]

        if action == "mark_read":
            notification_id = content.get("id")
            if notification_id:
                await self._mark_read(user=user, notification_id=notification_id)
        elif action == "mark_all_read":
            await self._mark_all_read(user)

    # ------------------------------------------------------------------
    # Group message handlers (called by channel_layer.group_send)
    # ------------------------------------------------------------------

    async def notification_message(self, event):
        """Push a new notification to the connected client."""
        await self.send_json({
            "type": "notification",
            "id": event["id"],
            "title": event["title"],
            "message": event["message"],
            "notification_type": event["notification_type"],
        })

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    @database_sync_to_async
    def _unread_count(self, user) -> int:
        from apps.tours.models import Notification

        return Notification.objects.filter(
            recipient=user, is_read=False
        ).count()

    @database_sync_to_async
    def _mark_read(self, user, notification_id: str) -> None:
        from apps.tours.models import Notification

        Notification.objects.filter(
            pk=notification_id, recipient=user
        ).update(is_read=True)

    @database_sync_to_async
    def _mark_all_read(self, user) -> None:
        from apps.tours.models import Notification

        Notification.objects.filter(recipient=user).update(is_read=True)
