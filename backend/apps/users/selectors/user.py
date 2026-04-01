from django.db.models import QuerySet

from apps.users.models import User


def user_get_queryset(*, pk) -> QuerySet[User]:
    return User.objects.filter(pk=pk)


def user_get_by_pk(*, pk) -> User:
    return User.objects.get(pk=pk)


def user_list_all() -> QuerySet[User]:
    return User.objects.all()
