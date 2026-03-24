from django.db.models import QuerySet

from apps.users.models import User


def user_get_queryset(*, pk) -> QuerySet[User]:
    return User.objects.filter(pk=pk)
