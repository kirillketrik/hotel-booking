import pytest
from model_bakery import baker
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return baker.make("users.User")


@pytest.fixture
def auth_client(api_client, user):
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    api_client.cookies["access_token"] = access
    api_client.cookies["refresh_token"] = str(refresh)

    return api_client, refresh
