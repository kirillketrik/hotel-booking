from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.users.permissions import IsUserHimself
from apps.users.serializers import RegisterUserSerializer, UserSerializer
from apps.users.service import UserService
from apps.users.utils import set_auth_cookies, delete_auth_cookies


class UsersViewSet(
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    def get_permissions(self):
        if self.action in ["register", "login", "csrf"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsUserHimself()]

    def get_serializer_class(self):
        if self.action == "register":
            return RegisterUserSerializer
        elif self.action == "login":
            return TokenObtainPairSerializer
        return UserSerializer

    @action(methods=["post"], detail=False)
    def register(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.instance = UserService.register(
            data=serializer.validated_data
        )
        response = self.perform_auth(user=serializer.instance)
        return response

    @action(methods=["post"], detail=False)
    def login(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0]) from e

        response = self.perform_auth(user=serializer.user)
        return response

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
            refresh_token=str(refresh_token)
        )
        return response
