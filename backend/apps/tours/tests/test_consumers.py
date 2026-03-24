import pytest
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import AnonymousUser
from model_bakery import baker

from apps.tours.consumers import NotificationConsumer
from apps.tours.enums import NotificationType
from apps.tours.models import Notification
from apps.users.models import User

pytestmark = pytest.mark.django_db(transaction=True)

# Use in-memory channel layer so tests don't need Redis
CHANNEL_LAYERS_OVERRIDE = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}


@pytest.fixture(autouse=True)
def inmemory_channel_layer(settings):
    settings.CHANNEL_LAYERS = CHANNEL_LAYERS_OVERRIDE


@pytest.fixture
def user(transactional_db):
    u = baker.prepare(
        User, email="ws@example.com", first_name="WS", last_name="User"
    )
    u.set_password("Pass123!")
    u.save()
    return u


@pytest.fixture
def other_user(transactional_db):
    u = baker.prepare(
        User,
        email="other_ws@example.com",
        first_name="Other",
        last_name="User",
    )
    u.set_password("Pass123!")
    u.save()
    return u


async def make_communicator(user=None) -> WebsocketCommunicator:
    communicator = WebsocketCommunicator(
        NotificationConsumer.as_asgi(), "/ws/notifications/"
    )
    if user is not None:
        communicator.scope["user"] = user
    return communicator


class TestConnection:
    async def test_authenticated_user_can_connect(self, user):
        communicator = await make_communicator(user)
        connected, _ = await communicator.connect()

        assert connected
        await communicator.disconnect()

    async def test_unauthenticated_connection_is_rejected(self):
        communicator = await make_communicator(AnonymousUser())
        connected, _ = await communicator.connect()

        assert not connected

    async def test_no_user_in_scope_is_rejected(self):
        communicator = await make_communicator()  # no user at all
        connected, _ = await communicator.connect()

        assert not connected

    async def test_on_connect_sends_unread_count(self, user):
        communicator = await make_communicator(user)
        await communicator.connect()

        message = await communicator.receive_json_from()

        assert message["type"] == "unread_count"
        assert message["count"] == 0
        await communicator.disconnect()

    async def test_unread_count_reflects_existing_notifications(self, user):
        await sync_to_async(baker.make)(
            Notification,
            recipient=user,
            notification_type=NotificationType.AGENCY_APPROVED,
            is_read=False,
            _quantity=3,
        )

        communicator = await make_communicator(user)
        await communicator.connect()
        message = await communicator.receive_json_from()

        assert message["type"] == "unread_count"
        assert message["count"] == 3
        await communicator.disconnect()

    async def test_already_read_notifications_not_counted(self, user):
        await sync_to_async(baker.make)(
            Notification,
            recipient=user,
            notification_type=NotificationType.AGENCY_APPROVED,
            is_read=True,
            _quantity=2,
        )

        communicator = await make_communicator(user)
        await communicator.connect()
        message = await communicator.receive_json_from()

        assert message["count"] == 0
        await communicator.disconnect()


class TestReceiveNotification:
    async def test_group_send_delivers_notification_to_client(self, user):
        communicator = await make_communicator(user)
        await communicator.connect()
        await communicator.receive_json_from()  # consume unread_count

        channel_layer = get_channel_layer()
        group_name = f"notifications_user_{user.pk}"
        await channel_layer.group_send(
            group_name,
            {
                "type": "notification.message",
                "id": "abc-123",
                "title": "Test",
                "message": "Hello",
                "notification_type": NotificationType.TOUR_APPROVED,
            },
        )

        message = await communicator.receive_json_from()

        assert message["type"] == "notification"
        assert message["id"] == "abc-123"
        assert message["title"] == "Test"
        assert message["notification_type"] == NotificationType.TOUR_APPROVED
        await communicator.disconnect()

    async def test_notification_only_goes_to_correct_user(
        self, user, other_user
    ):
        comm_user = await make_communicator(user)
        comm_other = await make_communicator(other_user)

        await comm_user.connect()
        await comm_other.connect()
        await comm_user.receive_json_from()  # consume unread_count
        await comm_other.receive_json_from()  # consume unread_count

        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f"notifications_user_{user.pk}",
            {
                "type": "notification.message",
                "id": "xyz",
                "title": "Only for user",
                "message": "msg",
                "notification_type": NotificationType.AGENCY_APPROVED,
            },
        )

        message = await comm_user.receive_json_from()
        assert message["type"] == "notification"

        # other_user should receive nothing
        assert await comm_other.receive_nothing()

        await comm_user.disconnect()
        await comm_other.disconnect()


class TestMarkRead:
    async def test_mark_read_updates_db(self, user):
        notification = await sync_to_async(baker.make)(
            Notification,
            recipient=user,
            notification_type=NotificationType.TOUR_APPROVED,
            is_read=False,
        )

        communicator = await make_communicator(user)
        await communicator.connect()
        await communicator.receive_json_from()  # consume unread_count

        await communicator.send_json_to(
            {"action": "mark_read", "id": str(notification.pk)}
        )

        # Give consumer time to process
        assert await communicator.receive_nothing()

        await sync_to_async(notification.refresh_from_db)()
        assert notification.is_read is True
        await communicator.disconnect()

    async def test_mark_read_ignores_other_users_notification(
        self, user, other_user
    ):
        other_notif = await sync_to_async(baker.make)(
            Notification,
            recipient=other_user,
            notification_type=NotificationType.TOUR_APPROVED,
            is_read=False,
        )

        communicator = await make_communicator(user)
        await communicator.connect()
        await communicator.receive_json_from()

        await communicator.send_json_to(
            {"action": "mark_read", "id": str(other_notif.pk)}
        )

        assert await communicator.receive_nothing()

        await sync_to_async(other_notif.refresh_from_db)()
        assert other_notif.is_read is False  # untouched
        await communicator.disconnect()


class TestMarkAllRead:
    async def test_mark_all_read_updates_all_own_notifications(self, user):
        notifs = await sync_to_async(baker.make)(
            Notification,
            recipient=user,
            notification_type=NotificationType.AGENCY_APPROVED,
            is_read=False,
            _quantity=3,
        )

        communicator = await make_communicator(user)
        await communicator.connect()
        await communicator.receive_json_from()

        await communicator.send_json_to({"action": "mark_all_read"})

        assert await communicator.receive_nothing()

        for notif in notifs:
            await sync_to_async(notif.refresh_from_db)()
            assert notif.is_read is True
        await communicator.disconnect()

    async def test_mark_all_read_does_not_affect_other_user(
        self, user, other_user
    ):
        other_notif = await sync_to_async(baker.make)(
            Notification,
            recipient=other_user,
            notification_type=NotificationType.AGENCY_APPROVED,
            is_read=False,
        )

        communicator = await make_communicator(user)
        await communicator.connect()
        await communicator.receive_json_from()

        await communicator.send_json_to({"action": "mark_all_read"})

        assert await communicator.receive_nothing()

        await sync_to_async(other_notif.refresh_from_db)()
        assert other_notif.is_read is False
        await communicator.disconnect()
