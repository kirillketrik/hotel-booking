from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tours.selectors import booking_list_for_user
from apps.tours.serializers import BookingSerializer
from apps.tours.services import booking_cancel


class BookingViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return booking_list_for_user(user=self.request.user)

    @action(methods=["post"], detail=True, url_path="cancel")
    def cancel(self, request, pk=None):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError

        booking = self.get_object()
        try:
            booking = booking_cancel(booking=booking, user=request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(BookingSerializer(booking).data)
