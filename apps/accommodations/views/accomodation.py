from rest_framework import viewsets, permissions

from apps.accommodations.serializers import AccommodationSerializer
from apps.accommodations.services import AccommodationService


class AccommodationViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return AccommodationService.get_queryset()

    def get_serializer_class(self):
        return AccommodationSerializer
