from rest_framework import mixins, permissions, viewsets

from apps.tours.models import Amenity
from apps.tours.serializers import AmenitySerializer


class AmenityViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = AmenitySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Amenity.objects.all()
