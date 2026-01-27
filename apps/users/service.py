from django.db.models import QuerySet

from apps.users.dto import UserRegisterDTO
from apps.users.models import User


class UserService:
    @staticmethod
    def get_queryset() -> QuerySet[User]:
        return User.objects.all()

    @staticmethod
    def register(data: UserRegisterDTO) -> User:
        return User.objects.create_user(**data)
