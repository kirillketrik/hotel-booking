from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tours.enums import EmployeeRole
from apps.tours.models import Agency, Tour
from apps.tours.permissions import IsAgencyAdmin, IsAgencyMember, IsApprovedAgency
from apps.tours.selectors import employee_get_owner, employee_list
from apps.tours.serializers import AgencyEmployeeRoleSerializer, AgencyEmployeeSerializer


class AgencyEmployeeViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AgencyEmployeeSerializer

    def get_permissions(self):
        if self.action in ("destroy", "update_role"):
            return [permissions.IsAuthenticated(), IsAgencyAdmin(), IsApprovedAgency()]
        return [permissions.IsAuthenticated(), IsAgencyMember()]

    def get_queryset(self):
        agency_pk = self.kwargs["agency_pk"]
        agency = get_object_or_404(Agency, pk=agency_pk)
        return employee_list(agency=agency)

    def destroy(self, request, *args, **kwargs):
        from rest_framework.exceptions import ValidationError

        employee = self.get_object()
        if employee.role == EmployeeRole.OWNER:
            raise ValidationError("Cannot remove the agency owner.")
        owner = employee_get_owner(agency=employee.agency)
        if owner:
            Tour.objects.filter(agency=employee.agency, created_by=employee).update(
                created_by=owner
            )
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(methods=["patch"], detail=True, url_path="role")
    def update_role(self, request, agency_pk=None, pk=None):
        from rest_framework.exceptions import ValidationError

        employee = self.get_object()
        if employee.role == EmployeeRole.OWNER:
            raise ValidationError("Cannot change the owner's role.")
        serializer = AgencyEmployeeRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee.role = serializer.validated_data["role"]
        employee.save(update_fields=["role"])
        return Response(AgencyEmployeeSerializer(employee).data)
