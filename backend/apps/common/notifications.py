from abc import ABC, abstractmethod


class BaseNotificationBackend(ABC):
    @abstractmethod
    def send(
        self,
        *,
        recipient,
        title: str,
        message: str,
        notification_type: str,
        **kwargs,
    ) -> None:
        pass


class InAppNotificationBackend(BaseNotificationBackend):
    def send(
        self,
        *,
        recipient,
        title: str,
        message: str,
        notification_type: str,
        **kwargs,
    ) -> None:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        from apps.tours.models import Notification

        notification = Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
        )

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            group_name = f"notifications_user_{recipient.pk}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "notification.message",
                    "id": str(notification.pk),
                    "title": title,
                    "message": message,
                    "notification_type": notification_type,
                },
            )


def notify(
    *,
    recipient,
    title: str,
    message: str,
    notification_type: str,
    backends: list[BaseNotificationBackend] | None = None,
) -> None:
    """
    Send a notification to a recipient.

    Pass custom backends to extend delivery channels (e.g. email, push).
    Defaults to in-app notification only.
    """
    active_backends = backends or [InAppNotificationBackend()]
    for backend in active_backends:
        backend.send(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
        )


def notify_admins(
    *,
    title: str,
    message: str,
    notification_type: str,
    backends: list[BaseNotificationBackend] | None = None,
) -> None:
    """Send a notification to all Django staff/superusers."""
    from django.contrib.auth import get_user_model

    UserModel = get_user_model()
    admins = UserModel.objects.filter(is_staff=True)
    for admin in admins:
        notify(
            recipient=admin,
            title=title,
            message=message,
            notification_type=notification_type,
            backends=backends,
        )
