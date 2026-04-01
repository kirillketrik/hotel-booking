from rest_framework import serializers

from apps.tours.models import Booking
from apps.tours.serializers.tour import TourSerializer


class BookingRoomSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    room_type = serializers.CharField()
    description = serializers.CharField()
    price_per_night = serializers.DecimalField(max_digits=10, decimal_places=2)
    capacity = serializers.IntegerField()


class BookingSerializer(serializers.ModelSerializer):
    tour = TourSerializer(read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.SerializerMethodField()
    room = BookingRoomSerializer(read_only=True)

    def get_user_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

    class Meta:
        model = Booking
        fields = (
            "id",
            "tour",
            "room",
            "room_count",
            "user_email",
            "user_full_name",
            "status",
            "adults_count",
            "children_count",
            "special_requests",
            "contact_phone",
            "total_price",
            "stripe_payment_intent_id",
            "created_at",
            "updated_at",
        )


class BookingCreateSerializer(serializers.Serializer):
    adults_count = serializers.IntegerField(min_value=1)
    children_count = serializers.IntegerField(min_value=0, default=0)
    contact_phone = serializers.CharField(max_length=30)
    special_requests = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    room_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    room_count = serializers.IntegerField(min_value=1, default=1)


class BookingCreateResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ("id", "status", "total_price", "stripe_client_secret")
