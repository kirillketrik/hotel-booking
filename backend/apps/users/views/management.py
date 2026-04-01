from rest_framework import mixins, permissions, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.users.selectors import user_list_all
from apps.users.serializers import UserManagementSerializer


class UserManagementViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Staff-only endpoint for listing and managing users."""

    serializer_class = UserManagementSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["email", "date_joined", "is_staff", "is_active"]
    ordering = ["-date_joined"]

    def get_queryset(self):
        return user_list_all()

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)
