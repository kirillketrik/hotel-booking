from django.urls import include, path
from rest_framework import routers

from .views import UserManagementViewSet, UsersViewSet

router = routers.DefaultRouter()
router.register(r"", UsersViewSet, basename="users")

mgmt_router = routers.DefaultRouter()
mgmt_router.register(r"", UserManagementViewSet, basename="user-management")

urlpatterns = [
    path("api/v1/users/", include(router.urls)),
    path("api/v1/staff/users/", include(mgmt_router.urls)),
]
