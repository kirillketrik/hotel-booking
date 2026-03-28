from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.tours.views import (
    AgencyEmployeeViewSet,
    AgencyViewSet,
    AmenityViewSet,
    InvitationRespondViewSet,
    InvitationViewSet,
    NotificationViewSet,
    TourViewSet,
    WishlistViewSet,
)

# /api/v1/agencies/
agency_router = DefaultRouter()
agency_router.register(r"", AgencyViewSet, basename="agencies")

# /api/v1/agencies/{agency_pk}/employees/
employee_router = DefaultRouter()
employee_router.register(r"", AgencyEmployeeViewSet, basename="agency-employees")

# /api/v1/agencies/{agency_pk}/invitations/
agency_invitation_router = DefaultRouter()
agency_invitation_router.register(r"", InvitationViewSet, basename="agency-invitations")

# /api/v1/agencies/{agency_pk}/tours/
agency_tour_router = DefaultRouter()
agency_tour_router.register(r"", TourViewSet, basename="agency-tours")

# /api/v1/invitations/  (accept/reject by token)
invitation_respond_router = DefaultRouter()
invitation_respond_router.register(r"", InvitationRespondViewSet, basename="invitations-respond")

# /api/v1/notifications/
notification_router = DefaultRouter()
notification_router.register(r"", NotificationViewSet, basename="notifications")

# /api/v1/amenities/
amenity_router = DefaultRouter()
amenity_router.register(r"", AmenityViewSet, basename="amenities")

# /api/v1/tours/  (public catalog — must be last)
public_tour_router = DefaultRouter()
public_tour_router.register(r"", TourViewSet, basename="public-tours")

# /api/v1/wishlist/
wishlist_router = DefaultRouter()
wishlist_router.register(r"", WishlistViewSet, basename="wishlist")

urlpatterns = [
    path("api/v1/agencies/<uuid:agency_pk>/employees/", include(employee_router.urls)),
    path("api/v1/agencies/<uuid:agency_pk>/invitations/", include(agency_invitation_router.urls)),
    path("api/v1/agencies/<uuid:agency_pk>/tours/", include(agency_tour_router.urls)),
    path("api/v1/agencies/", include(agency_router.urls)),
    path("api/v1/amenities/", include(amenity_router.urls)),
    path("api/v1/invitations/", include(invitation_respond_router.urls)),
    path("api/v1/notifications/", include(notification_router.urls)),
    path("api/v1/wishlist/", include(wishlist_router.urls)),
    # Must be last — catches /api/v1/tours/<pk>/
    path("api/v1/tours/", include(public_tour_router.urls)),
]
