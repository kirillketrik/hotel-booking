from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import AuthenticationFailed, ValidationError

from apps.users.models import User


def user_register(
    *, email: str, password: str, first_name: str, last_name: str
) -> User:
    try:
        return User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
    except DjangoValidationError as e:
        raise ValidationError(e.message_dict) from e


def user_login(*, email: str, password: str, request=None) -> User:
    user = authenticate(request=request, email=email, password=password)
    if not user:
        raise AuthenticationFailed("Invalid credentials")
    if not user.is_active:
        raise AuthenticationFailed("User account is disabled")
    return user
