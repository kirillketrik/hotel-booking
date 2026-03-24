from rest_framework import serializers

from apps.tours.models import Amenity, Hotel, HotelImage, HotelRoom


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ("id", "name", "icon")


class HotelImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelImage
        fields = ("id", "image", "order")


class HotelRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelRoom
        fields = (
            "id",
            "room_type",
            "description",
            "price_per_night",
            "capacity",
            "quantity",
        )


class HotelSerializer(serializers.ModelSerializer):
    images = HotelImageSerializer(many=True, read_only=True)
    rooms = HotelRoomSerializer(many=True, read_only=True)
    amenities = AmenitySerializer(many=True, read_only=True)

    class Meta:
        model = Hotel
        fields = ("id", "name", "description", "stars", "amenities", "images", "rooms")


class HotelRoomInputSerializer(serializers.Serializer):
    room_type = serializers.ChoiceField(
        choices=HotelRoom._meta.get_field("room_type").choices
    )
    description = serializers.CharField(required=False, allow_blank=True)
    price_per_night = serializers.DecimalField(max_digits=10, decimal_places=2)
    capacity = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class HotelInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    stars = serializers.IntegerField(min_value=1, max_value=5)
    amenity_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False
    )
    rooms = HotelRoomInputSerializer(many=True, required=False)
