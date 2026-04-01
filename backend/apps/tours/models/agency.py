import uuid6
from computedfields.models import ComputedFieldsModel, computed
from django.db import models
from django.db.models import Avg
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from apps.common.models import BaseModel, TimeStampedModel
from apps.tours.enums.agency import (
    AgencyStatus,
    EmployeeRole,
    InvitationStatus,
)


class Agency(ComputedFieldsModel, BaseModel, TimeStampedModel):
    name = models.CharField(
        max_length=255, unique=True, verbose_name=_("Name")
    )
    description = models.TextField(verbose_name=_("Description"))
    logo = models.ImageField(
        upload_to="agencies/logos/",
        null=True,
        blank=True,
        verbose_name=_("Logo"),
    )
    status = models.CharField(
        max_length=20,
        choices=AgencyStatus.choices,
        default=AgencyStatus.PENDING,
        verbose_name=_("Status"),
    )
    rejection_reason = models.TextField(
        blank=True, verbose_name=_("Rejection Reason")
    )

    @computed(
        models.DecimalField(
            max_digits=3,
            decimal_places=1,
            null=True,
            blank=True,
            verbose_name=_("Rating"),
        ),
        depends=[("agency_reviews", ["rating"])],
    )
    def rating(self):
        result = self.agency_reviews.aggregate(avg=Avg("rating"))["avg"]
        if result is None:
            return None
        return round(result, 1)

    class Meta:
        verbose_name = _("Agency")
        verbose_name_plural = _("Agencies")

    def __str__(self):
        return self.name


class AgencyEmployee(BaseModel, TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="agency_memberships",
        verbose_name=_("User"),
    )
    agency = models.ForeignKey(
        Agency,
        on_delete=models.PROTECT,
        related_name="employees",
        verbose_name=_("Agency"),
    )
    role = models.CharField(
        max_length=20,
        choices=EmployeeRole.choices,
        verbose_name=_("Role"),
    )

    class Meta:
        verbose_name = _("Agency Employee")
        verbose_name_plural = _("Agency Employees")
        unique_together = ("user", "agency")

    def __str__(self):
        return f"{self.user} @ {self.agency} ({self.role})"


class Invitation(BaseModel, TimeStampedModel):
    agency = models.ForeignKey(
        Agency,
        on_delete=models.CASCADE,
        related_name="invitations",
        verbose_name=_("Agency"),
    )
    created_by = models.ForeignKey(
        AgencyEmployee,
        on_delete=models.PROTECT,
        related_name="sent_invitations",
        verbose_name=_("Created By"),
    )
    invited_email = models.EmailField(
        null=True,
        blank=True,
        verbose_name=_("Invited Email"),
    )
    invited_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_invitations",
        verbose_name=_("Invited User"),
    )
    token = models.UUIDField(
        default=uuid6.uuid7,
        unique=True,
        editable=False,
        verbose_name=_("Token"),
    )
    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.choices,
        default=InvitationStatus.PENDING,
        verbose_name=_("Status"),
    )
    role = models.CharField(
        max_length=20,
        choices=[
            (EmployeeRole.ADMIN, EmployeeRole.ADMIN.label),
            (EmployeeRole.OPERATOR, EmployeeRole.OPERATOR.label),
        ],
        default=EmployeeRole.OPERATOR,
        verbose_name=_("Assigned Role"),
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Expires At"),
    )

    class Meta:
        verbose_name = _("Invitation")
        verbose_name_plural = _("Invitations")

    def __str__(self):
        target = self.invited_email or self.invited_user or "link"
        return f"Invitation to {self.agency} for {target}"
