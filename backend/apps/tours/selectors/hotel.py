from django.db.models import QuerySet

from apps.tours.models import HotelRoom


def hotel_room_list_for_tour(*, tour) -> QuerySet[HotelRoom]:
    return HotelRoom.objects.filter(hotel__tour=tour)
