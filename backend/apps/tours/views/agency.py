from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.tours.enums import EmployeeRole
from apps.tours.models import Agency
from apps.tours.selectors import (
    agency_list_for_staff,
    agency_list_for_user,
    agency_list_public,
)
from apps.tours.serializers import (
    AgencyCreateSerializer,
    AgencyModerationSerializer,
    AgencySerializer,
    AgencyUpdateSerializer,
)
from apps.tours.services import (
    agency_approve,
    agency_create,
    agency_delete,
    agency_reject,
    agency_update,
)


class AgencyViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        if self.action in ("retrieve", "destroy"):
            if user.is_authenticated and (user.is_staff or self.action == "destroy"):
                return agency_list_for_staff()
            return agency_list_public()
        qs = agency_list_for_user(user=user)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return AgencyCreateSerializer
        if self.action == "partial_update":
            return AgencyUpdateSerializer
        if self.action in ("approve", "reject"):
            return AgencyModerationSerializer
        return AgencySerializer

    def get_permissions(self):
        if self.action in ("approve", "reject"):
            return [permissions.IsAdminUser()]
        if self.action == "retrieve":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        from rest_framework.exceptions import PermissionDenied

        agency = self.get_object()
        employee = agency.employees.filter(user=request.user).first()
        if not employee or employee.role != EmployeeRole.OWNER:
            raise PermissionDenied("Only the agency owner can delete the agency.")
        agency_delete(agency=agency)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agency = agency_create(user=request.user, **serializer.validated_data)
        return Response(
            AgencySerializer(agency).data,
            status=status.HTTP_201_CREATED,
        )

    @action(methods=["patch"], detail=True, url_path="update")
    def partial_update_agency(self, request, pk=None):
        agency = get_object_or_404(Agency, pk=pk, employees__user=request.user)
        serializer = AgencyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agency = agency_update(agency=agency, **serializer.validated_data)
        return Response(AgencySerializer(agency).data)

    @action(methods=["post"], detail=True)
    def approve(self, request, pk=None):
        agency = get_object_or_404(Agency, pk=pk)
        agency = agency_approve(agency=agency)
        return Response(AgencySerializer(agency).data)

    @action(methods=["post"], detail=True)
    def reject(self, request, pk=None):
        agency = get_object_or_404(Agency, pk=pk)
        serializer = AgencyModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("reason", "")
        agency = agency_reject(agency=agency, reason=reason)
        return Response(AgencySerializer(agency).data)


class StaffAgencyViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "status"]
    ordering = ["-created_at"]
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = agency_list_for_staff()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs
