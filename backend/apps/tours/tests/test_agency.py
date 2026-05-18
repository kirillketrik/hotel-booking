import pytest
from django.urls import reverse

from apps.tours.enums import AgencyStatus
from apps.tours.models import Agency, AgencyEmployee, Notification
from apps.tours.services import agency_create

pytestmark = pytest.mark.django_db


class TestAgencyCreate:
    url = reverse("agencies-list")

    def test_success_creates_agency_and_employee(self, auth_client, user):
        payload = {"name": "New Agency", "description": "A great agency"}
        response = auth_client.post(self.url, payload)

        assert response.status_code == 201
        assert response.data["name"] == "New Agency"
        assert response.data["status"] == AgencyStatus.PENDING

        agency = Agency.objects.get(name="New Agency")
        assert agency.owner == user
        assert AgencyEmployee.objects.filter(user=user, agency=agency).exists()

    def test_unauthenticated_returns_403(self, api_client):
        payload = {"name": "Any Agency", "description": "desc"}
        response = api_client.post(self.url, payload)

        assert response.status_code == 403

    def test_missing_required_fields_returns_400(self, auth_client):
        response = auth_client.post(self.url, {})

        assert response.status_code == 400

    def test_missing_name_returns_400(self, auth_client):
        response = auth_client.post(self.url, {"description": "no name"})

        assert response.status_code == 400

    def test_duplicate_name_returns_400(self, auth_client, agency):
        # `agency` fixture already created "Test Agency" for this user
        payload = {"name": "Test Agency", "description": "duplicate"}
        response = auth_client.post(self.url, payload)

        assert response.status_code == 400


class TestAgencyList:
    url = reverse("agencies-list")

    def test_owner_sees_own_agency(self, auth_client, agency):
        response = auth_client.get(self.url)

        assert response.status_code == 200
        ids = [item["id"] for item in response.data["results"]]
        assert str(agency.pk) in ids

    def test_other_user_sees_no_agencies(self, other_client, agency):
        response = other_client.get(self.url)

        assert response.status_code == 200
        assert response.data["results"] == []

    def test_unauthenticated_returns_403(self, api_client, agency):
        response = api_client.get(self.url)

        assert response.status_code == 403

    def test_admin_sees_all_agencies(self, admin_client, agency, other_user):
        # Create a second agency owned by other_user
        agency_create(
            user=other_user,
            name="Other Agency",
            description="other desc",
        )
        response = admin_client.get(self.url)

        assert response.status_code == 200
        assert response.data["results"] == []


class TestStaffAgencyList:
    url = reverse("staff-agencies-list")

    def test_admin_sees_all_agencies(self, admin_client, agency, other_user):
        agency_create(
            user=other_user,
            name="Other Agency",
            description="other desc",
        )

        response = admin_client.get(self.url)

        assert response.status_code == 200
        assert len(response.data["results"]) >= 2

    def test_staff_filter_by_status(self, admin_client, agency):
        response = admin_client.get(self.url, {"status": AgencyStatus.PENDING})

        assert response.status_code == 200
        ids = [item["id"] for item in response.data["results"]]
        assert str(agency.pk) in ids


class TestAgencyUpdate:
    def test_success_updates_and_resets_to_pending(
        self, auth_client, approved_agency
    ):
        url = reverse(
            "agencies-partial-update-agency",
            kwargs={"pk": approved_agency.pk},
        )
        response = auth_client.patch(url, {"name": "Updated Agency Name"})

        assert response.status_code == 200
        assert response.data["name"] == "Updated Agency Name"
        assert response.data["status"] == AgencyStatus.PENDING

        approved_agency.refresh_from_db()
        assert approved_agency.status == AgencyStatus.PENDING

    def test_non_member_gets_404(self, other_client, approved_agency):
        url = reverse(
            "agencies-partial-update-agency",
            kwargs={"pk": approved_agency.pk},
        )
        response = other_client.patch(url, {"description": "sneaky"})

        assert response.status_code == 404

    def test_unauthenticated_gets_403(self, api_client, approved_agency):
        url = reverse(
            "agencies-partial-update-agency",
            kwargs={"pk": approved_agency.pk},
        )
        response = api_client.patch(url, {"name": "hacked"})

        assert response.status_code == 403


class TestAgencyModeration:
    def test_approve_sets_status_and_notifies_owner(
        self, admin_client, agency, user
    ):
        url = reverse("agencies-approve", kwargs={"pk": agency.pk})
        response = admin_client.post(url)

        assert response.status_code == 200
        assert response.data["status"] == AgencyStatus.APPROVED

        agency.refresh_from_db()
        assert agency.status == AgencyStatus.APPROVED

        assert Notification.objects.filter(
            recipient=user,
            notification_type="agency_approved",
        ).exists()

    def test_reject_sets_reason(self, admin_client, agency):
        url = reverse("agencies-reject", kwargs={"pk": agency.pk})
        response = admin_client.post(url, {"reason": "Incomplete info"})

        assert response.status_code == 200
        assert response.data["status"] == AgencyStatus.REJECTED

        agency.refresh_from_db()
        assert agency.status == AgencyStatus.REJECTED
        assert agency.rejection_reason == "Incomplete info"

    def test_non_admin_approve_returns_403(self, auth_client, agency):
        url = reverse("agencies-approve", kwargs={"pk": agency.pk})
        response = auth_client.post(url)

        assert response.status_code == 403

    def test_non_admin_reject_returns_403(self, auth_client, agency):
        url = reverse("agencies-reject", kwargs={"pk": agency.pk})
        response = auth_client.post(url, {"reason": "nope"})

        assert response.status_code == 403
