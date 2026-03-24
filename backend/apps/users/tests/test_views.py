import pytest
from django.conf import settings
from django.urls import reverse

from apps.users.models import User

pytestmark = pytest.mark.django_db

VALID_REGISTER_DATA = {
    "email": "newuser@example.com",
    "first_name": "New",
    "last_name": "User",
    "password": "StrongPass123!",
    "password2": "StrongPass123!",
}


class TestRegisterView:
    def test_success(self, api_client):
        response = api_client.post(
            reverse("users-register"), VALID_REGISTER_DATA
        )

        assert response.status_code == 200
        assert settings.SETTINGS.AUTH.AUTH_COOKIE in response.cookies
        assert settings.SETTINGS.AUTH.REFRESH_COOKIE in response.cookies
        assert User.objects.filter(email=VALID_REGISTER_DATA["email"]).exists()

    @pytest.mark.parametrize(
        "invalid_data, expected_status",
        [
            (
                {**VALID_REGISTER_DATA, "password2": "DifferentPass456!"},
                400,
            ),
            (
                {**VALID_REGISTER_DATA, "password": "123", "password2": "123"},
                400,
            ),
            (
                {**VALID_REGISTER_DATA, "email": "not-an-email"},
                400,
            ),
            (
                {},
                400,
            ),
        ],
    )
    def test_invalid_register(self, api_client, invalid_data, expected_status):
        response = api_client.post(reverse("users-register"), invalid_data)

        assert response.status_code == expected_status

    def test_duplicate_email(self, api_client, user):
        data = {**VALID_REGISTER_DATA, "email": user.email}
        response = api_client.post(reverse("users-register"), data)

        assert response.status_code == 400


class TestLoginView:
    def test_success(self, api_client, user, user_password):
        data = {"email": user.email, "password": user_password}
        response = api_client.post(reverse("users-login"), data)

        assert response.status_code == 200
        assert settings.SETTINGS.AUTH.AUTH_COOKIE in response.cookies
        assert settings.SETTINGS.AUTH.REFRESH_COOKIE in response.cookies

    @pytest.mark.parametrize(
        "email, password",
        [
            ("testuser@example.com", "wrongpassword"),
            ("noone@example.com", "whatever123!"),
        ],
    )
    def test_invalid_credentials(self, api_client, user, email, password):
        response = api_client.post(
            reverse("users-login"), {"email": email, "password": password}
        )

        assert response.status_code == 403

    def test_missing_fields(self, api_client):
        response = api_client.post(reverse("users-login"), {})

        assert response.status_code == 400

    def test_inactive_user(self, api_client, user, user_password):
        user.is_active = False
        user.save()
        data = {"email": user.email, "password": user_password}
        response = api_client.post(reverse("users-login"), data)

        assert response.status_code == 403


class TestMeView:
    def test_success(self, auth_client, user):
        response = auth_client.get(reverse("users-me"))

        assert response.status_code == 200
        assert response.data["email"] == user.email
        assert response.data["first_name"] == user.first_name
        assert response.data["last_name"] == user.last_name
        assert "id" in response.data
        assert "groups" in response.data

    def test_unauthenticated(self, api_client):
        response = api_client.get(reverse("users-me"))

        assert response.status_code == 403


class TestLogoutView:
    def test_success(self, auth_client):
        response = auth_client.post(reverse("users-logout"))

        assert response.status_code == 200
        access_cookie = response.cookies.get(
            settings.SETTINGS.AUTH.AUTH_COOKIE
        )
        refresh_cookie = response.cookies.get(
            settings.SETTINGS.AUTH.REFRESH_COOKIE
        )
        # delete_cookie sets value="" and max-age=0
        assert access_cookie is not None
        assert access_cookie.value == ""
        assert refresh_cookie is not None
        assert refresh_cookie.value == ""

    def test_unauthenticated(self, api_client):
        response = api_client.post(reverse("users-logout"))

        assert response.status_code == 403


class TestRefreshView:
    def test_success(self, auth_client, refresh_token):
        auth_client.cookies[settings.SETTINGS.AUTH.REFRESH_COOKIE] = str(
            refresh_token
        )
        response = auth_client.post(reverse("users-refresh"))

        assert response.status_code == 200
        assert settings.SETTINGS.AUTH.AUTH_COOKIE in response.cookies

    def test_missing_refresh_token(self, auth_client):
        response = auth_client.post(reverse("users-refresh"))

        assert response.status_code == 401

    def test_invalid_refresh_token(self, auth_client):
        auth_client.cookies[settings.SETTINGS.AUTH.REFRESH_COOKIE] = (
            "invalid.token.value"
        )
        response = auth_client.post(reverse("users-refresh"))

        assert response.status_code == 401

    def test_inactive_user(self, auth_client, user, refresh_token):
        user.is_active = False
        user.save()
        auth_client.cookies[settings.SETTINGS.AUTH.REFRESH_COOKIE] = str(
            refresh_token
        )
        response = auth_client.post(reverse("users-refresh"))

        assert response.status_code == 401

    def test_unauthenticated(self, api_client):
        response = api_client.post(reverse("users-refresh"))

        assert response.status_code == 403


class TestCsrfView:
    def test_success(self, api_client):
        response = api_client.get(reverse("users-csrf"))

        assert response.status_code == 200
        assert "csrftoken" in response.cookies


class TestUpdateView:
    def test_update_success(self, auth_client, user):
        url = reverse("users-detail", kwargs={"pk": user.pk})
        response = auth_client.put(
            url, {"first_name": "Updated", "last_name": "Name"}
        )

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.first_name == "Updated"
        assert user.last_name == "Name"

    def test_partial_update_success(self, auth_client, user):
        url = reverse("users-detail", kwargs={"pk": user.pk})
        response = auth_client.patch(url, {"first_name": "Patched"})

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.first_name == "Patched"

    def test_unauthenticated(self, api_client, user):
        url = reverse("users-detail", kwargs={"pk": user.pk})
        response = api_client.put(url, {"first_name": "X", "last_name": "Y"})

        assert response.status_code == 403

    def test_read_only_fields_ignored(self, auth_client, user):
        original_email = user.email
        url = reverse("users-detail", kwargs={"pk": user.pk})
        auth_client.put(
            url,
            {"first_name": "X", "last_name": "Y", "email": "hacker@evil.com"},
        )

        user.refresh_from_db()
        assert user.email == original_email

    def test_update_other_user(self, auth_client, user):
        from model_bakery import baker

        other = baker.make(User)
        url = reverse("users-detail", kwargs={"pk": other.pk})
        response = auth_client.put(url, {"first_name": "X", "last_name": "Y"})

        assert response.status_code == 404
