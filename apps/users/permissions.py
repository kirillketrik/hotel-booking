from rest_framework import permissions


class DoesAssosiatedWithUser(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user == obj
