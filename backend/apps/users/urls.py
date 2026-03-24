from django.urls import include, path
from rest_framework import routers

from .views import UsersViewSet

router = routers.DefaultRouter()
router.register(r"", UsersViewSet, basename="users")

urlpatterns = [
    path("api/v1/users/", include(router.urls)),
]
