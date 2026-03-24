from rest_framework.permissions import BasePermission

from apps.tours.models import AgencyEmployee
from apps.tours.enums import EmployeeRole


def get_employee(user, agency) -> AgencyEmployee | None:
    try:
        return AgencyEmployee.objects.get(user=user, agency=agency)
    except AgencyEmployee.DoesNotExist:
        return None


class IsAgencyAdmin(BasePermission):
    """
    Checks that the requesting user is an employee with role=ADMIN
    in the agency identified by the `agency_pk` URL kwarg.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        agency_pk = view.kwargs.get("agency_pk")
        if not agency_pk:
            return False
        employee = get_employee(request.user, agency_pk)
        return employee is not None and employee.role == EmployeeRole.ADMIN


class IsAgencyMember(BasePermission):
    """
    Checks that the requesting user is any employee (admin or operator)
    in the agency identified by the `agency_pk` URL kwarg.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        agency_pk = view.kwargs.get("agency_pk")
        if not agency_pk:
            return False
        return AgencyEmployee.objects.filter(
            user=request.user, agency_id=agency_pk
        ).exists()
