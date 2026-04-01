from django.db.models import QuerySet

from apps.tours.enums import EmployeeRole
from apps.tours.models import AgencyEmployee


def employee_list(*, agency) -> QuerySet[AgencyEmployee]:
    return AgencyEmployee.objects.filter(agency=agency).select_related("user")


def employee_get_owner(*, agency) -> AgencyEmployee | None:
    return AgencyEmployee.objects.filter(
        agency=agency, role=EmployeeRole.OWNER
    ).first()
