from datetime import date
from decimal import Decimal

import pytest
from model_bakery import baker
from rest_framework.test import APIClient

from apps.tours.enums import AgencyStatus, EmployeeRole
from apps.tours.models import AgencyEmployee, Location
from apps.tours.services import (
    agency_approve,
    agency_create,
    invitation_create,
    tour_approve,
    tour_create,
)
from apps.users.models import User


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@pytest.fixture
def user(db):
    u = baker.prepare(
        User,
        email="owner@example.com",
        first_name="Agency",
        last_name="Owner",
    )
    u.set_password("Pass123!")
    u.save()
    return u


@pytest.fixture
def other_user(db):
    u = baker.prepare(
        User,
        email="other@example.com",
        first_name="Other",
        last_name="User",
    )
    u.set_password("Pass123!")
    u.save()
    return u


@pytest.fixture
def admin_user(db):
    u = baker.prepare(
        User,
        email="admin@example.com",
        first_name="Staff",
        last_name="Admin",
        is_staff=True,
    )
    u.set_password("Pass123!")
    u.save()
    return u


@pytest.fixture
def operator_user(db):
    u = baker.prepare(
        User,
        email="operator@example.com",
        first_name="Agency",
        last_name="Operator",
    )
    u.set_password("Pass123!")
    u.save()
    return u


# ---------------------------------------------------------------------------
# API clients
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def other_client(other_user):
    client = APIClient()
    client.force_authenticate(user=other_user)
    return client


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def operator_client(operator_user):
    client = APIClient()
    client.force_authenticate(user=operator_user)
    return client


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------


@pytest.fixture
def location(db):
    return baker.make(Location, country="France", city="Paris")


# ---------------------------------------------------------------------------
# Agency
# ---------------------------------------------------------------------------


@pytest.fixture
def agency(user):
    return agency_create(
        user=user,
        name="Test Agency",
        description="desc",
    )


@pytest.fixture
def approved_agency(agency):
    return agency_approve(agency=agency)


# ---------------------------------------------------------------------------
# Employees
# ---------------------------------------------------------------------------


@pytest.fixture
def agency_admin(user, agency):
    # agency_create already creates an ADMIN employee for the owner
    return AgencyEmployee.objects.get(user=user, agency=agency)


@pytest.fixture
def agency_operator(operator_user, approved_agency):
    return baker.make(
        AgencyEmployee,
        user=operator_user,
        agency=approved_agency,
        role=EmployeeRole.OPERATOR,
    )


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------


@pytest.fixture
def pending_invitation(approved_agency, agency_admin):
    # agency_admin fixture references `agency`, but approved_agency is the
    # same underlying Agency object (approved_agency calls agency_approve on
    # the same agency fixture). We need an admin for approved_agency.
    admin = AgencyEmployee.objects.get(
        user=agency_admin.user, agency=approved_agency
    )
    return invitation_create(
        agency=approved_agency,
        created_by=admin,
    )


@pytest.fixture
def personal_invitation(approved_agency, agency_admin, other_user):
    admin = AgencyEmployee.objects.get(
        user=agency_admin.user, agency=approved_agency
    )
    return invitation_create(
        agency=approved_agency,
        created_by=admin,
        invited_user=other_user,
    )


# ---------------------------------------------------------------------------
# Tours
# ---------------------------------------------------------------------------


@pytest.fixture
def tour(approved_agency, agency_admin):
    admin = AgencyEmployee.objects.get(
        user=agency_admin.user, agency=approved_agency
    )
    return tour_create(
        agency=approved_agency,
        created_by=admin,
        title="Paris Adventure",
        description="Explore Paris in 10 days.",
        price=Decimal("999.00"),
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 10),
        location_data={"country": "France", "city": "Paris"},
        max_adults=10,
        max_children=5,
    )


@pytest.fixture
def approved_tour(tour):
    return tour_approve(tour=tour)
