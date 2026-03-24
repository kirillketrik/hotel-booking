from django.contrib import admin

from apps.tours.models import (
    Agency,
    AgencyEmployee,
    Amenity,
    Hotel,
    HotelImage,
    HotelRoom,
    Invitation,
    Location,
    Notification,
    Tour,
    TourImage,
    TourTransfer,
)

admin.site.register(Agency)
admin.site.register(AgencyEmployee)
admin.site.register(Amenity)
admin.site.register(Hotel)
admin.site.register(HotelImage)
admin.site.register(HotelRoom)
admin.site.register(Invitation)
admin.site.register(Location)
admin.site.register(Notification)
admin.site.register(Tour)
admin.site.register(TourImage)
admin.site.register(TourTransfer)
