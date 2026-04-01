from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tours.models import Tour, Wishlist
from apps.tours.selectors import wishlist_tour_list
from apps.tours.serializers import TourSerializer


class WishlistViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = TourSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return wishlist_tour_list(user=self.request.user)

    @action(methods=["post"], detail=False, url_path="toggle/(?P<tour_pk>[^/.]+)")
    def toggle(self, request, tour_pk=None):
        tour = get_object_or_404(Tour, pk=tour_pk)
        obj, created = Wishlist.objects.get_or_create(
            user=request.user, tour=tour
        )
        if not created:
            obj.delete()
        return Response({"wishlisted": created}, status=status.HTTP_200_OK)
