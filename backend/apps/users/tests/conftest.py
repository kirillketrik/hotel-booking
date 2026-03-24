import pytest
from model_bakery import baker
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User


@pytest.fixture
def user_password():
    return "TestPassword123!"


@pytest.fixture
def user(db, user_password):
    u = baker.prepare(User, email="testuser@example.com")
    u.set_password(user_password)
    u.save()
    return u


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def refresh_token(user):
    return RefreshToken.for_user(user)
