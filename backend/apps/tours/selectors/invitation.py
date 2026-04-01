from django.db.models import QuerySet

from apps.tours.models import Invitation


def invitation_list(*, agency) -> QuerySet[Invitation]:
    return Invitation.objects.filter(agency=agency).select_related(
        "invited_user", "created_by__user"
    )


def invitation_list_for_user(*, user) -> QuerySet[Invitation]:
    return Invitation.objects.select_related("agency").filter(invited_user=user)


def invitation_get_all() -> QuerySet[Invitation]:
    return Invitation.objects.select_related("agency").all()
