import pytest
from django.urls import reverse
from model_bakery import baker

from apps.tours.enums import NotificationType
from apps.tours.models import Notification

pytestmark = pytest.mark.django_db

LIST_URL = reverse("notifications-list")
READ_ALL_URL = reverse("notifications-mark-all-read")


def _make_notification(user, is_read=False):
    return baker.make(
        Notification,
        recipient=user,
        title="Test notification",
        message="Something happened",
        notification_type=NotificationType.AGENCY_APPROVED,
        is_read=is_read,
    )


class TestNotificationList:
    def test_returns_own_notifications(self, auth_client, user):
        n = _make_notification(user)
        response = auth_client.get(LIST_URL)

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(n.pk) in ids

    def test_does_not_return_other_users_notifications(
        self, auth_client, other_user
    ):
        other_notif = _make_notification(other_user)
        response = auth_client.get(LIST_URL)

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(other_notif.pk) not in ids

    def test_unauthenticated_returns_403(self, api_client):
        response = api_client.get(LIST_URL)

        assert response.status_code == 403


class TestMarkRead:
    def test_marks_single_notification_as_read(self, auth_client, user):
        n = _make_notification(user, is_read=False)
        url = reverse("notifications-mark-read", kwargs={"pk": n.pk})
        response = auth_client.post(url)

        assert response.status_code == 200
        n.refresh_from_db()
        assert n.is_read is True

    def test_cannot_mark_other_users_notification(
        self, auth_client, other_user
    ):
        other_notif = _make_notification(other_user)
        url = reverse("notifications-mark-read", kwargs={"pk": other_notif.pk})
        response = auth_client.post(url)

        assert response.status_code == 404

    def test_unauthenticated_returns_403(self, api_client, user):
        n = _make_notification(user)
        url = reverse("notifications-mark-read", kwargs={"pk": n.pk})
        response = api_client.post(url)

        assert response.status_code == 403


class TestMarkAllRead:
    def test_marks_all_own_notifications_as_read(self, auth_client, user):
        n1 = _make_notification(user, is_read=False)
        n2 = _make_notification(user, is_read=False)
        response = auth_client.post(READ_ALL_URL)

        assert response.status_code == 200
        n1.refresh_from_db()
        n2.refresh_from_db()
        assert n1.is_read is True
        assert n2.is_read is True

    def test_does_not_affect_other_users_notifications(
        self, auth_client, user, other_user
    ):
        other_notif = _make_notification(other_user, is_read=False)
        auth_client.post(READ_ALL_URL)

        other_notif.refresh_from_db()
        assert other_notif.is_read is False

    def test_unauthenticated_returns_403(self, api_client):
        response = api_client.post(READ_ALL_URL)

        assert response.status_code == 403
