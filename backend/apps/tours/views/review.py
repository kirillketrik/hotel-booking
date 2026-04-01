from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response

from apps.common.permissions import IsRightUser
from apps.tours.models import Tour, TourReview
from apps.tours.selectors import review_list_for_tour
from apps.tours.serializers import TourReviewCreateSerializer, TourReviewSerializer
from apps.tours.services import review_create, review_delete, review_update


class TourReviewViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    def get_permissions(self):
        if self.action == "list":
            return [permissions.AllowAny()]
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsRightUser()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TourReviewCreateSerializer
        return TourReviewSerializer

    def _get_tour(self) -> Tour:
        return get_object_or_404(Tour, pk=self.kwargs["tour_pk"])

    def get_queryset(self):
        return review_list_for_tour(tour=self._get_tour())

    def create(self, request, *args, **kwargs):
        serializer = TourReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            review = review_create(
                user=request.user,
                tour=self._get_tour(),
                **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(
            TourReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        review = self.get_object()
        serializer = TourReviewCreateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            review = review_update(review=review, **serializer.validated_data)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(TourReviewSerializer(review).data)

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        try:
            review_delete(review=review, user=request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(status=status.HTTP_204_NO_CONTENT)
