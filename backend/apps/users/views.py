from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.users.selectors import user_get_queryset
from apps.users.serializers import (
    RegisterUserSerializer,
    LoginUserSerializer,
    UserSerializer,
)
from apps.users.services import user_register, user_login
from apps.users.utils import delete_auth_cookies, set_auth_cookies


class UsersViewSet(
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    def get_queryset(self):
        return user_get_queryset(pk=self.request.user.pk)

    def get_permissions(self):
        if self.action in ["register", "login", "csrf"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "register":
            return RegisterUserSerializer
        elif self.action == "login":
            return LoginUserSerializer
        return UserSerializer

    @action(methods=["post"], detail=False)
    def register(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = user_register(**serializer.validated_data)
        response = self.perform_auth(user=user)
        return response

    @action(methods=["post"], detail=False)
    def login(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = user_login(
            request=request,
            **serializer.validated_data
        )
        return self.perform_auth(user=user)

    @action(methods=["get"], detail=False)
    def me(self, request, *args, **kwargs):
        user = self.request.user
        serializer = self.get_serializer(user)
        return Response(data=serializer.data)

    @action(methods=["post"], detail=False)
    def logout(self, request, *args, **kwargs):
        response = Response(status=status.HTTP_200_OK)
        delete_auth_cookies(response=response)
        return response

    @action(methods=["post"], detail=False)
    def refresh(self, request, *args, **kwargs):
        refresh_token_str = request.COOKIES.get(
            settings.SETTINGS.AUTH.REFRESH_COOKIE
        )

        if not refresh_token_str:
            return Response(
                {"detail": "Refresh token missing"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token_str)

            try:
                user = User.objects.get(pk=refresh["user_id"])
            except User.DoesNotExist:
                user = None
            if not user or not user.is_active:
                return Response(
                    {"detail": "Token is invalid or expired"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            response = Response(status=status.HTTP_200_OK)
            data = {
                "access": str(refresh.access_token),
                "refresh": refresh_token_str,
            }

            if settings.SETTINGS.AUTH.ROTATE_REFRESH_TOKENS:
                if settings.SETTINGS.AUTH.BLACKLIST_AFTER_ROTATION:
                    try:
                        refresh.blacklist()
                    except AttributeError:
                        pass

                # Generate a new refresh token
                refresh.set_jti()
                refresh.set_exp()
                refresh.set_iat()
                data["refresh"] = str(refresh)

            set_auth_cookies(
                response=response,
                access_token=data.get("access"),
                refresh_token=data.get("refresh"),
            )

            return response

        except (TokenError, InvalidToken):
            response = Response(
                {"detail": "Token is invalid or expired"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            delete_auth_cookies(response=response)
            return response

    @method_decorator(ensure_csrf_cookie)
    @action(methods=["get"], detail=False)
    def csrf(self, request, *args, **kwargs):
        get_token(request)
        return Response(status=status.HTTP_200_OK)

    def perform_auth(self, user: User) -> Response:
        response = Response(status=status.HTTP_200_OK)
        refresh_token = RefreshToken.for_user(user)
        access_token = refresh_token.access_token
        set_auth_cookies(
            response=response,
            access_token=str(access_token),
            refresh_token=str(refresh_token),
        )
        return response
