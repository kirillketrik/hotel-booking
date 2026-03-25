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
    Send a notification synchronously (runs in the calling thread).
    Used internally by the Celery worker — call notify_async() from
    application code so delivery is offloaded to a worker process.
    """
    active_backends = backends or [InAppNotificationBackend()]
    for backend in active_backends:
        backend.send(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
        )


def notify_async(
    *,
    recipient,
    title: str,
    message: str,
    notification_type: str,
) -> None:
    """
    Enqueue a notification via Celery. Falls back to synchronous delivery
    if the broker is unavailable so the calling request is never broken.
    """
    import logging

    from apps.tours.tasks import send_notification_task

    try:
        send_notification_task.delay(
            recipient_id=recipient.pk,
            title=title,
            message=message,
            notification_type=notification_type,
        )
    except Exception:
        logging.getLogger(__name__).exception(
            "Celery broker unavailable — sending notification synchronously"
        )
        notify(
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
) -> None:
    """Enqueue notifications for all Django staff/superusers."""
    from django.contrib.auth import get_user_model

    UserModel = get_user_model()
    for admin in UserModel.objects.filter(is_staff=True):
        notify_async(
            recipient=admin,
            title=title,
            message=message,
            notification_type=notification_type,
        )
