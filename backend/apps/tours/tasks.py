from celery import shared_task


@shared_task
def send_notification_task(
    recipient_id: int,
    title: str,
    message: str,
    notification_type: str,
) -> None:
    """Async wrapper for sending in-app notifications via Celery."""
    from django.contrib.auth import get_user_model

    from apps.common.notifications import notify

    User = get_user_model()
    try:
        recipient = User.objects.get(pk=recipient_id)
    except User.DoesNotExist:
        return
    notify(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
    )
