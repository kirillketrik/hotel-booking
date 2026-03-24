import pytest
from django.urls import reverse

from apps.tours.enums import TourStatus
from apps.tours.models import AgencyEmployee, Notification

pytestmark = pytest.mark.django_db

VALID_TOUR_PAYLOAD = {
    "title": "Rome Explorer",
    "description": "A wonderful tour across Rome.",
    "price": "750.00",
    "start_date": "2026-06-01",
    "end_date": "2026-06-10",
    "location": {"country": "Italy", "city": "Rome"},
    "max_adults": 8,
    "max_children": 4,
}


class TestTourCreate:
    def _list_url(self, agency_pk):
        return reverse("agency-tours-list", kwargs={"agency_pk": agency_pk})

    def test_agency_admin_creates_tour_with_pending_status(
        self, auth_client, approved_agency
    ):
        url = self._list_url(approved_agency.pk)
        response = auth_client.post(url, VALID_TOUR_PAYLOAD, format="json")

        assert response.status_code == 201
        assert response.data["status"] == TourStatus.PENDING
        assert response.data["title"] == "Rome Explorer"

    def test_agency_admin_tour_duration_computed_correctly(
        self, auth_client, approved_agency
    ):
        url = self._list_url(approved_agency.pk)
        response = auth_client.post(url, VALID_TOUR_PAYLOAD, format="json")

        assert response.status_code == 201
        # 2026-06-10 minus 2026-06-01 = 9 days
        assert response.data["duration_days"] == 9

    def test_operator_can_create_tour(
        self, operator_client, approved_agency, agency_operator
    ):
        url = self._list_url(approved_agency.pk)
        response = operator_client.post(url, VALID_TOUR_PAYLOAD, format="json")

        assert response.status_code == 201

    def test_non_member_returns_403(self, other_client, approved_agency):
        url = self._list_url(approved_agency.pk)
        response = other_client.post(url, VALID_TOUR_PAYLOAD, format="json")

        assert response.status_code == 403

    def test_unauthenticated_returns_403(self, api_client, approved_agency):
        url = self._list_url(approved_agency.pk)
        response = api_client.post(url, VALID_TOUR_PAYLOAD, format="json")

        assert response.status_code == 403

    def test_end_date_before_start_date_returns_400(
        self, auth_client, approved_agency
    ):
        url = self._list_url(approved_agency.pk)
        payload = {
            **VALID_TOUR_PAYLOAD,
            "start_date": "2026-06-10",
            "end_date": "2026-06-01",
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == 400

    def test_end_date_equal_to_start_date_returns_400(
        self, auth_client, approved_agency
    ):
        url = self._list_url(approved_agency.pk)
        payload = {
            **VALID_TOUR_PAYLOAD,
            "start_date": "2026-06-01",
            "end_date": "2026-06-01",
        }
        response = auth_client.post(url, payload, format="json")

        assert response.status_code == 400

    def test_missing_required_fields_returns_400(
        self, auth_client, approved_agency
    ):
        url = self._list_url(approved_agency.pk)
        response = auth_client.post(url, {}, format="json")

        assert response.status_code == 400


class TestTourList:
    def test_public_can_list_approved_tours(
        self, api_client, approved_tour, approved_agency
    ):
        url = reverse(
            "agency-tours-list", kwargs={"agency_pk": approved_agency.pk}
        )
        response = api_client.get(url)

        assert response.status_code == 200
        ids = [item["id"] for item in response.data["results"]]
        assert str(approved_tour.pk) in ids

    def test_list_filtered_by_agency_pk(
        self, api_client, approved_tour, approved_agency, other_user
    ):
        from datetime import date
        from decimal import Decimal

        from apps.tours.services import (
            agency_approve,
            agency_create,
            tour_approve,
            tour_create,
        )

        # Create a second agency + tour that should NOT appear in results
        other_agency = agency_create(
            user=other_user,
            name="Other Agency",
            description="other desc",
        )
        other_agency = agency_approve(agency=other_agency)
        other_admin = AgencyEmployee.objects.get(
            user=other_user, agency=other_agency
        )
        other_tour = tour_create(
            agency=other_agency,
            created_by=other_admin,
            title="Other Tour",
            description="other desc",
            price=Decimal("100.00"),
            start_date=date(2026, 7, 1),
            end_date=date(2026, 7, 5),
            location_data={"country": "Spain", "city": "Madrid"},
            max_adults=5,
            max_children=2,
        )
        tour_approve(tour=other_tour)

        url = reverse(
            "agency-tours-list", kwargs={"agency_pk": approved_agency.pk}
        )
        response = api_client.get(url)

        assert response.status_code == 200
        ids = [item["id"] for item in response.data["results"]]
        assert str(approved_tour.pk) in ids
        assert str(other_tour.pk) not in ids


class TestTourUpdate:
    def _update_url(self, agency_pk, tour_pk):
        return reverse(
            "agency-tours-partial-update-tour",
            kwargs={"agency_pk": agency_pk, "pk": tour_pk},
        )

    def test_agency_admin_can_update_and_resets_to_pending(
        self, auth_client, approved_tour, approved_agency
    ):
        url = self._update_url(approved_agency.pk, approved_tour.pk)
        response = auth_client.patch(
            url, {"title": "Updated Title"}, format="json"
        )

        assert response.status_code == 200
        assert response.data["title"] == "Updated Title"
        assert response.data["status"] == TourStatus.PENDING

        approved_tour.refresh_from_db()
        assert approved_tour.status == TourStatus.PENDING

    def test_non_member_returns_403(
        self, other_client, approved_tour, approved_agency
    ):
        url = self._update_url(approved_agency.pk, approved_tour.pk)
        response = other_client.patch(
            url, {"title": "Sneaky Update"}, format="json"
        )

        assert response.status_code == 403

    def test_unauthenticated_returns_403(
        self, api_client, approved_tour, approved_agency
    ):
        url = self._update_url(approved_agency.pk, approved_tour.pk)
        response = api_client.patch(
            url, {"title": "Not Allowed"}, format="json"
        )

        assert response.status_code == 403

    def test_operator_can_update_tour(
        self,
        operator_client,
        approved_tour,
        approved_agency,
        agency_operator,
    ):
        url = self._update_url(approved_agency.pk, approved_tour.pk)
        response = operator_client.patch(
            url, {"max_adults": 20}, format="json"
        )

        assert response.status_code == 200
        approved_tour.refresh_from_db()
        assert approved_tour.max_adults == 20


class TestTourModeration:
    def test_approve_sets_approved_and_notifies(
        self, admin_client, tour, approved_agency, user
    ):
        url = reverse(
            "agency-tours-approve",
            kwargs={"agency_pk": approved_agency.pk, "pk": tour.pk},
        )
        response = admin_client.post(url)

        assert response.status_code == 200
        assert response.data["status"] == TourStatus.APPROVED

        tour.refresh_from_db()
        assert tour.status == TourStatus.APPROVED

        assert Notification.objects.filter(
            recipient=user,
            notification_type="tour_approved",
        ).exists()

    def test_reject_sets_reason(self, admin_client, tour, approved_agency):
        url = reverse(
            "agency-tours-reject",
            kwargs={"agency_pk": approved_agency.pk, "pk": tour.pk},
        )
        response = admin_client.post(url, {"reason": "Low quality"})

        assert response.status_code == 200
        assert response.data["status"] == TourStatus.REJECTED

        tour.refresh_from_db()
        assert tour.status == TourStatus.REJECTED
        assert tour.rejection_reason == "Low quality"

    def test_non_admin_approve_returns_403(
        self, auth_client, tour, approved_agency
    ):
        url = reverse(
            "agency-tours-approve",
            kwargs={"agency_pk": approved_agency.pk, "pk": tour.pk},
        )
        response = auth_client.post(url)

        assert response.status_code == 403

    def test_non_admin_reject_returns_403(
        self, auth_client, tour, approved_agency
    ):
        url = reverse(
            "agency-tours-reject",
            kwargs={"agency_pk": approved_agency.pk, "pk": tour.pk},
        )
        response = auth_client.post(url, {"reason": "nope"})

        assert response.status_code == 403
