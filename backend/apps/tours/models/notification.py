from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.common.models import BaseModel, TimeStampedModel
from apps.tours.enums.tour import NotificationType


class Notification(BaseModel, TimeStampedModel):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name=_("Recipient"),
    )
    title = models.CharField(max_length=255, verbose_name=_("Title"))
    message = models.TextField(verbose_name=_("Message"))
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        verbose_name=_("Type"),
    )
    is_read = models.BooleanField(default=False, verbose_name=_("Is Read"))

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("Notification")
        verbose_name_plural = _("Notifications")

    def __str__(self):
        return f"{self.notification_type} → {self.recipient}"
