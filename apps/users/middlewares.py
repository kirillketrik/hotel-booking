import copy

from django.conf import settings
from rest_framework import status
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.utils import set_access_cookie, set_refresh_cookie


class JWTAutoRefreshMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['REFRESH_COOKIE'])

            if refresh_token:
                try:
                    refresh = RefreshToken(refresh_token)
                    new_access_token = str(refresh.access_token)

                    new_request = copy.copy(request)
                    new_request.META = copy.copy(request.META)
                    new_request.META['HTTP_AUTHORIZATION'] = f'Bearer {new_access_token}'

                    response = self.get_response(new_request)

                    if response.status_code != status.HTTP_401_UNAUTHORIZED:
                        set_access_cookie(response=response, value=new_access_token)

                        if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False):
                            set_refresh_cookie(response=response, value=new_access_token)

                except (TokenError, Exception):
                    pass

        return response
