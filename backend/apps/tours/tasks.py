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


@shared_task(bind=True)
def tour_bulk_import_task(
    self,
    agency_id: str,
    employee_id: str,
    csv_text: str,
    requester_id: int,
) -> dict:
    """
    Run tour bulk import from CSV text and notify the requester when done.

    Returns:
        {"created": int, "errors": [...]}
    """
    import io

    from django.contrib.auth import get_user_model

    from apps.common.notifications import notify
    from apps.tours.enums import NotificationType
    from apps.tours.models import Agency, AgencyEmployee
    from apps.tours.services import tour_bulk_import

    User = get_user_model()

    class _FakeFile:
        """Wraps a string so tour_bulk_import can call .read().decode()."""

        def __init__(self, text: str) -> None:
            self._bytes = text.encode("utf-8")

        def read(self) -> bytes:
            return self._bytes

    try:
        agency = Agency.objects.get(pk=agency_id)
        created_by = AgencyEmployee.objects.get(pk=employee_id)
    except Exception as exc:
        return {"created": 0, "errors": [{"row": 0, "title": "", "errors": [str(exc)]}]}

    result = tour_bulk_import(
        agency=agency,
        created_by=created_by,
        file=_FakeFile(csv_text),
    )

    try:
        requester = User.objects.get(pk=requester_id)
        error_count = len(result["errors"])
        if error_count == 0:
            msg = f"{result['created']} tour(s) imported successfully."
        else:
            msg = (
                f"{result['created']} tour(s) imported. "
                f"{error_count} row(s) failed — check import results."
            )
        notify(
            recipient=requester,
            title="Tour import complete",
            message=msg,
            notification_type=NotificationType.TOUR_SUBMITTED,
        )
    except User.DoesNotExist:
        pass

    return result
