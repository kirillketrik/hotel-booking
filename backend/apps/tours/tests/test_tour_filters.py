from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse

from apps.tours.models import AgencyEmployee
from apps.tours.services import (
    agency_approve,
    agency_create,
    tour_approve,
    tour_create,
)

pytestmark = pytest.mark.django_db


def _list_url(agency_pk):
    return reverse("agency-tours-list", kwargs={"agency_pk": agency_pk})


def _make_tour(agency, admin, **kwargs):
    defaults = dict(
        title="Tour",
        description="desc",
        price=Decimal("500.00"),
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 8),
        location_data={"country": "France", "city": "Paris"},
        max_adults=10,
        max_children=5,
    )
    defaults.update(kwargs)
    t = tour_create(agency=agency, created_by=admin, **defaults)
    return tour_approve(tour=t)


@pytest.fixture
def setup(db, user, other_user):
    agency = agency_approve(
        agency=agency_create(user=user, name="Agency A", description="d")
    )
    admin = AgencyEmployee.objects.get(user=user, agency=agency)

    cheap = _make_tour(
        agency,
        admin,
        title="Budget Rome",
        price=Decimal("200.00"),
        location_data={"country": "Italy", "city": "Rome"},
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 4),
    )
    mid = _make_tour(
        agency,
        admin,
        title="Paris Adventure",
        price=Decimal("600.00"),
        location_data={"country": "France", "city": "Paris"},
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 8),
    )
    expensive = _make_tour(
        agency,
        admin,
        title="Luxury Spain",
        price=Decimal("1500.00"),
        location_data={"country": "Spain", "city": "Madrid"},
        start_date=date(2026, 8, 1),
        end_date=date(2026, 8, 15),
    )
    return agency, cheap, mid, expensive


class TestTourSearch:
    def test_search_by_title(self, api_client, setup):
        agency, cheap, mid, _ = setup
        response = api_client.get(_list_url(agency.pk), {"search": "Budget"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(cheap.pk) in ids
        assert str(mid.pk) not in ids

    def test_search_by_city(self, api_client, setup):
        agency, cheap, mid, _ = setup
        response = api_client.get(_list_url(agency.pk), {"search": "Paris"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(mid.pk) in ids
        assert str(cheap.pk) not in ids

    def test_search_by_country(self, api_client, setup):
        agency, cheap, _, expensive = setup
        response = api_client.get(_list_url(agency.pk), {"search": "Italy"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(cheap.pk) in ids
        assert str(expensive.pk) not in ids


class TestTourFilters:
    def test_filter_by_status(self, api_client, setup):
        # All tours from setup are approved; add one pending tour to verify filtering
        agency, cheap, _, _ = setup
        admin = AgencyEmployee.objects.get(agency=agency, role="admin")
        pending = tour_create(
            agency=agency,
            created_by=admin,
            title="Pending Tour",
            description="not approved yet",
            price=Decimal("300.00"),
            start_date=date(2026, 9, 1),
            end_date=date(2026, 9, 5),
            location_data={"country": "Germany", "city": "Berlin"},
            max_adults=5,
            max_children=2,
        )

        response = api_client.get(_list_url(agency.pk), {"status": "approved"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(cheap.pk) in ids
        assert str(pending.pk) not in ids
        for item in response.data["results"]:
            assert item["status"] == "approved"

    def test_filter_price_min(self, api_client, setup):
        agency, cheap, mid, expensive = setup
        response = api_client.get(_list_url(agency.pk), {"price_min": "700"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(expensive.pk) in ids
        assert str(cheap.pk) not in ids
        assert str(mid.pk) not in ids

    def test_filter_price_max(self, api_client, setup):
        agency, cheap, mid, expensive = setup
        response = api_client.get(_list_url(agency.pk), {"price_max": "300"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(cheap.pk) in ids
        assert str(mid.pk) not in ids
        assert str(expensive.pk) not in ids

    def test_filter_price_range(self, api_client, setup):
        agency, cheap, mid, expensive = setup
        response = api_client.get(
            _list_url(agency.pk), {"price_min": "400", "price_max": "800"}
        )

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(mid.pk) in ids
        assert str(cheap.pk) not in ids
        assert str(expensive.pk) not in ids

    def test_filter_by_country(self, api_client, setup):
        agency, cheap, _, expensive = setup
        response = api_client.get(_list_url(agency.pk), {"country": "Spain"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(expensive.pk) in ids
        assert str(cheap.pk) not in ids

    def test_filter_by_city_case_insensitive(self, api_client, setup):
        agency, cheap, mid, _ = setup
        response = api_client.get(_list_url(agency.pk), {"city": "paris"})

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(mid.pk) in ids
        assert str(cheap.pk) not in ids

    def test_filter_start_date_from(self, api_client, setup):
        agency, cheap, mid, expensive = setup
        response = api_client.get(
            _list_url(agency.pk), {"start_date_from": "2026-07-01"}
        )

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(mid.pk) in ids
        assert str(expensive.pk) in ids
        assert str(cheap.pk) not in ids

    def test_filter_start_date_to(self, api_client, setup):
        agency, cheap, mid, _ = setup
        response = api_client.get(
            _list_url(agency.pk), {"start_date_to": "2026-06-30"}
        )

        assert response.status_code == 200
        ids = [r["id"] for r in response.data["results"]]
        assert str(cheap.pk) in ids
        assert str(mid.pk) not in ids


class TestTourOrdering:
    def test_order_by_price_asc(self, api_client, setup):
        agency, _, _, _ = setup
        response = api_client.get(_list_url(agency.pk), {"ordering": "price"})

        assert response.status_code == 200
        prices = [Decimal(r["price"]) for r in response.data["results"]]
        assert prices == sorted(prices)

    def test_order_by_price_desc(self, api_client, setup):
        agency, _, _, _ = setup
        response = api_client.get(_list_url(agency.pk), {"ordering": "-price"})

        assert response.status_code == 200
        prices = [Decimal(r["price"]) for r in response.data["results"]]
        assert prices == sorted(prices, reverse=True)

    def test_order_by_start_date_asc(self, api_client, setup):
        agency, _, _, _ = setup
        response = api_client.get(
            _list_url(agency.pk), {"ordering": "start_date"}
        )

        assert response.status_code == 200
        dates = [r["start_date"] for r in response.data["results"]]
        assert dates == sorted(dates)

    def test_order_by_duration_desc(self, api_client, setup):
        agency, _, _, _ = setup
        response = api_client.get(
            _list_url(agency.pk), {"ordering": "-duration_days"}
        )

        assert response.status_code == 200
        durations = [r["duration_days"] for r in response.data["results"]]
        assert durations == sorted(durations, reverse=True)
