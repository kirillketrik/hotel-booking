from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware


class CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            raw_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE'])
        else:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        self.enforce_csrf(request)

        return user, validated_token

    def enforce_csrf(self, request):
        if request.method not in ("GET", "HEAD", "OPTIONS", "TRACE"):
            check = CSRFCheck(lambda r: None)
            check.process_request(request)

            reason = check.process_view(request, None, (), {})
            if reason:
                raise exceptions.PermissionDenied(f'CSRF Failed')
