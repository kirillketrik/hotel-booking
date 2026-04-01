from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, viewsets

from apps.tours.models import Agency
from apps.tours.permissions import IsAgencyMember
from apps.tours.selectors import booking_list_for_agency
from apps.tours.serializers import BookingSerializer


class AgencyBookingViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only list of all bookings for an agency's tours. Accessible to any agency member."""

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsAgencyMember]

    def get_queryset(self):
        agency = get_object_or_404(Agency, pk=self.kwargs["agency_pk"])
        return booking_list_for_agency(agency=agency)
