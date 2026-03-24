import pytest
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

from apps.tours.enums import InvitationStatus
from apps.tours.models import AgencyEmployee, Invitation
from apps.tours.services import invitation_create

pytestmark = pytest.mark.django_db


class TestInvitationCreate:
    def _list_url(self, agency_pk):
        return reverse(
            "agency-invitations-list", kwargs={"agency_pk": agency_pk}
        )

    def test_link_only_invitation_success(
        self, auth_client, approved_agency
    ):
        url = self._list_url(approved_agency.pk)
        response = auth_client.post(url, {})

        assert response.status_code == 201
        assert response.data["invited_email"] is None
        assert response.data["invited_user"] is None
        assert response.data["status"] == InvitationStatus.PENDING

    def test_invitation_by_email_success(
        self, auth_client, approved_agency
    ):
        url = self._list_url(approved_agency.pk)
        response = auth_client.post(
            url, {"invited_email": "guest@example.com"}
        )

        assert response.status_code == 201
        assert response.data["invited_email"] == "guest@example.com"

    def test_invitation_by_user_id_success(
        self, auth_client, approved_agency, other_user
    ):
        url = self._list_url(approved_agency.pk)
        response = auth_client.post(
            url, {"invited_user": str(other_user.pk)}
        )

        assert response.status_code == 201
        assert response.data["invited_user"] == other_user.pk

    def test_operator_cannot_create_invitation(
        self, operator_client, approved_agency, agency_operator
    ):
        url = self._list_url(approved_agency.pk)
        response = operator_client.post(url, {})

        assert response.status_code == 403

    def test_unauthenticated_returns_403(self, api_client, approved_agency):
        url = self._list_url(approved_agency.pk)
        response = api_client.post(url, {})

        assert response.status_code == 403

    def test_non_member_returns_403(
        self, other_client, approved_agency
    ):
        url = self._list_url(approved_agency.pk)
        response = other_client.post(url, {})

        assert response.status_code == 403


class TestInvitationList:
    def _list_url(self, agency_pk):
        return reverse(
            "agency-invitations-list", kwargs={"agency_pk": agency_pk}
        )

    def test_agency_admin_can_list(
        self, auth_client, approved_agency, pending_invitation
    ):
        url = self._list_url(approved_agency.pk)
        response = auth_client.get(url)

        assert response.status_code == 200
        ids = [item["id"] for item in response.data["results"]]
        assert str(pending_invitation.pk) in ids

    def test_non_member_cannot_list(
        self, other_client, approved_agency, pending_invitation
    ):
        url = self._list_url(approved_agency.pk)
        response = other_client.get(url)

        assert response.status_code == 403

    def test_operator_cannot_list(
        self,
        operator_client,
        approved_agency,
        agency_operator,
        pending_invitation,
    ):
        url = self._list_url(approved_agency.pk)
        response = operator_client.get(url)

        assert response.status_code == 403


class TestInvitationAccept:
    def _accept_url(self, token):
        return reverse(
            "invitations-respond-accept", kwargs={"token": token}
        )

    def test_success_creates_employee_and_sets_accepted(
        self, other_client, other_user, pending_invitation
    ):
        url = self._accept_url(pending_invitation.token)
        response = other_client.post(url)

        assert response.status_code == 200

        pending_invitation.refresh_from_db()
        assert pending_invitation.status == InvitationStatus.ACCEPTED

        assert AgencyEmployee.objects.filter(
            user=other_user,
            agency=pending_invitation.agency,
        ).exists()

    def test_wrong_user_for_personal_invite_returns_400(
        self, auth_client, personal_invitation
    ):
        # personal_invitation targets other_user; auth_client is `user`
        url = self._accept_url(personal_invitation.token)
        response = auth_client.post(url)

        assert response.status_code == 400

    def test_already_accepted_returns_400(
        self, other_client, pending_invitation
    ):
        url = self._accept_url(pending_invitation.token)
        # Accept once
        other_client.post(url)
        # Try to accept again
        response = other_client.post(url)

        assert response.status_code == 400

    def test_expired_invitation_returns_400(
        self, other_client, approved_agency, agency_admin
    ):
        from apps.tours.models import AgencyEmployee as AE

        admin = AE.objects.get(
            user=agency_admin.user, agency=approved_agency
        )
        expired_inv = invitation_create(
            agency=approved_agency,
            created_by=admin,
            expires_at=timezone.now() - timedelta(hours=1),
        )
        url = self._accept_url(expired_inv.token)
        response = other_client.post(url)

        assert response.status_code == 400


class TestInvitationReject:
    def _reject_url(self, token):
        return reverse(
            "invitations-respond-reject", kwargs={"token": token}
        )

    def test_success_sets_status_rejected(
        self, other_client, pending_invitation
    ):
        url = self._reject_url(pending_invitation.token)
        response = other_client.post(url)

        assert response.status_code == 200

        pending_invitation.refresh_from_db()
        assert pending_invitation.status == InvitationStatus.REJECTED

    def test_already_rejected_returns_400(
        self, other_client, pending_invitation
    ):
        url = self._reject_url(pending_invitation.token)
        # Reject once
        other_client.post(url)
        # Try to reject again
        response = other_client.post(url)

        assert response.status_code == 400
