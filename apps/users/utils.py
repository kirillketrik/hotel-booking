from datetime import timedelta

from rest_framework.response import Response
from django.conf import settings


def _set_auth_cookie(
        response: Response,
        key: str,
        value: str,
        max_age: timedelta
):
    response.set_cookie(
        key=key,
        value=value,
        max_age=max_age,
        **settings.SETTINGS.AUTH.AUTH_COOKIE_DEFAULTS
    )


def set_access_cookie(response: Response, value: str):
    _set_auth_cookie(
        response=response,
        key=settings.SETTINGS.AUTH.AUTH_COOKIE,
        value=value,
        max_age=timedelta(minutes=settings.SETTINGS.AUTH.ACCESS_TOKEN_LIFETIME)
    )


def set_refresh_cookie(response: Response, value: str):
    _set_auth_cookie(
        response=response,
        key=settings.SETTINGS.AUTH.REFRESH_COOKIE,
        value=value,
        max_age=timedelta(minutes=settings.SETTINGS.AUTH.REFRESH_TOKEN_LIFETIME),
    )


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> Response:
    set_access_cookie(response=response, value=access_token)
    set_refresh_cookie(response=response, value=refresh_token)
    return response


def delete_auth_cookies(response: Response) -> Response:
    response.delete_cookie(settings.SETTINGS.AUTH.AUTH_COOKIE)
    response.delete_cookie(settings.SETTINGS.AUTH.REFRESH_COOKIE)
    return response
