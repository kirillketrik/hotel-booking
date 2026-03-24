from rest_framework import serializers

from apps.tours.models import Tour, TourImage, TourTransfer
from apps.tours.serializers.hotel import HotelInputSerializer, HotelSerializer
from apps.tours.serializers.location import LocationSerializer


class TourImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourImage
        fields = ("id", "image", "order")


class TourTransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = TourTransfer
        fields = ("id", "transfer_type", "description", "price", "is_included")


class TourSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    images = TourImageSerializer(many=True, read_only=True)
    hotels = HotelSerializer(many=True, read_only=True)
    transfers = TourTransferSerializer(many=True, read_only=True)

    class Meta:
        model = Tour
        fields = (
            "id",
            "agency",
            "title",
            "description",
            "cover_image",
            "price",
            "start_date",
            "end_date",
            "duration_days",
            "location",
            "max_adults",
            "max_children",
            "status",
            "rejection_reason",
            "images",
            "hotels",
            "transfers",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "duration_days",
            "status",
            "rejection_reason",
            "created_at",
            "updated_at",
        )


class TourTransferInputSerializer(serializers.Serializer):
    transfer_type = serializers.ChoiceField(
        choices=TourTransfer._meta.get_field("transfer_type").choices
    )
    description = serializers.CharField(required=False, allow_blank=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_included = serializers.BooleanField(default=False)


class TourCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    cover_image = serializers.ImageField(required=False)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    location = LocationSerializer()
    max_adults = serializers.IntegerField(min_value=0)
    max_children = serializers.IntegerField(min_value=0)
    hotels = HotelInputSerializer(many=True, required=False)
    transfers = TourTransferInputSerializer(many=True, required=False)

    def validate(self, data):
        if data["end_date"] <= data["start_date"]:
            raise serializers.ValidationError(
                "end_date must be after start_date."
            )
        return data


class TourUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False)
    cover_image = serializers.ImageField(required=False)
    price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False
    )
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    max_adults = serializers.IntegerField(min_value=0, required=False)
    max_children = serializers.IntegerField(min_value=0, required=False)

    def validate(self, data):
        start = data.get("start_date")
        end = data.get("end_date")
        if start and end and end <= start:
            raise serializers.ValidationError(
                "end_date must be after start_date."
            )
        return data


class TourModerationSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)
