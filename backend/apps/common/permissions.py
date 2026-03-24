from rest_framework.permissions import BasePermission


class IsRightUser(BasePermission):
    def __init__(self, user_field: str = "user"):
        self.user_field = user_field

    def has_object_permission(self, request, view, obj):
        return getattr(obj, self.user_field) == request.user


class IsApprovedOperator(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and hasattr(request.user, "operator_profile")
            and request.user.operator_profile.status == "approved"
        )
