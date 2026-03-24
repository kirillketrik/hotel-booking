from http.cookies import SimpleCookie

from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


def _get_cookie(scope: dict, name: str) -> str | None:
    headers = dict(scope.get("headers", []))
    cookie_header = headers.get(b"cookie", b"").decode("utf-8")
    jar = SimpleCookie()
    jar.load(cookie_header)
    morsel = jar.get(name)
    return morsel.value if morsel else None


@database_sync_to_async
def get_user_from_jwt(scope):
    try:
        # Cookie token (httponly cookies are sent by the browser
        # during the WebSocket handshake)
        token = _get_cookie(scope, settings.SETTINGS.AUTH.AUTH_COOKIE)

        if not token:
            return None

        access_token = AccessToken(token)
        return User.objects.get(id=access_token["user_id"])
    except (InvalidToken, TokenError, User.DoesNotExist):
        return None


class WebSocketJWTAuthMiddleware:
    def __init__(self, app):
        self.app = app
        self.session_auth_app = AuthMiddlewareStack(app)

    async def __call__(self, scope, receive, send):
        user = await get_user_from_jwt(scope)
        if user is not None:
            scope["user"] = user
            return await self.app(scope, receive, send)
        # Fall back to Django session auth (used by admin)
        return await self.session_auth_app(scope, receive, send)
