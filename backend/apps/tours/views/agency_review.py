from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response

from apps.common.permissions import IsRightUser
from apps.tours.models import Agency, AgencyReview
from apps.tours.selectors import agency_review_list
from apps.tours.serializers import AgencyReviewCreateSerializer, AgencyReviewSerializer
from apps.tours.services import agency_review_create, agency_review_delete, agency_review_update


class AgencyReviewViewSet(
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
            return AgencyReviewCreateSerializer
        return AgencyReviewSerializer

    def _get_agency(self) -> Agency:
        return get_object_or_404(Agency, pk=self.kwargs["agency_pk"])

    def get_queryset(self):
        return agency_review_list(agency=self._get_agency())

    def create(self, request, *args, **kwargs):
        serializer = AgencyReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            review = agency_review_create(
                user=request.user,
                agency=self._get_agency(),
                **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(
            AgencyReviewSerializer(review).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        review = self.get_object()
        serializer = AgencyReviewCreateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            review = agency_review_update(review=review, **serializer.validated_data)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(AgencyReviewSerializer(review).data)

    def destroy(self, request, *args, **kwargs):
        review = self.get_object()
        try:
            agency_review_delete(review=review, user=request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages) from exc
        return Response(status=status.HTTP_204_NO_CONTENT)
