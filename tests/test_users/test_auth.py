import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestAuthentication:
    def test_me_endpoint_unauthorized(self, api_client):
        url = reverse('users-me')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_endpoint_with_cookie(self, auth_client, user):
        client, _ = auth_client
        url = reverse('users-me')
        response = client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email

    @pytest.mark.parametrize("email, password", [("test@gmail.com", "very@st21sa@")])
    def test_login_sets_cookies(self, api_client, email, password):
        user = User.objects.create_user(email=email, password=password, first_name="test", last_name="test")
        url = reverse('users-login')
        data = {
            "email": user,
            "password": password
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert 'access_token' in response.cookies
        assert 'refresh_token' in response.cookies
