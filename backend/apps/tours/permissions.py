from rest_framework.permissions import BasePermission

from apps.tours.enums import AgencyStatus, EmployeeRole
from apps.tours.models import Agency, AgencyEmployee


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
        return employee is not None and employee.role in (
            EmployeeRole.OWNER, EmployeeRole.ADMIN
        )


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


class IsAgencyAdminOrStaff(BasePermission):
    """
    Allows access to staff users OR agency employees with owner/admin role.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        agency_pk = view.kwargs.get("agency_pk")
        if not agency_pk:
            return False
        employee = get_employee(request.user, agency_pk)
        return employee is not None and employee.role in (
            EmployeeRole.OWNER, EmployeeRole.ADMIN
        )


class IsApprovedAgency(BasePermission):
    """
    Allows access only when the agency identified by `agency_pk` is approved.
    """

    message = (
        "This action is not available until the agency is approved."
    )

    def has_permission(self, request, view):
        if request.user and request.user.is_staff:
            return True
        agency_pk = view.kwargs.get("agency_pk")
        if not agency_pk:
            return False
        return Agency.objects.filter(
            pk=agency_pk, status=AgencyStatus.APPROVED
        ).exists()
