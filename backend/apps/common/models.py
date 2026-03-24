import uuid6
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import IntegrityError, models
from django.db.models import deletion
from django.utils.translation import gettext_lazy as _


class BaseModel(models.Model):
    id = models.UUIDField(
        primary_key=True, editable=False, default=uuid6.uuid7
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.full_clean()
        try:
            super().save(*args, **kwargs)
        except IntegrityError as e:
            error_str = str(e)
            if (
                "unique constraint" in error_str
                or "duplicate key" in error_str
            ):
                raise ValidationError(
                    message="This record already exists."
                ) from e
            raise

    def delete(self, *args, **kwargs):
        try:
            return super().delete(*args, **kwargs)
        except deletion.ProtectedError as e:
            model_name = str(self._meta.verbose_name).capitalize()
            protected_object = next(iter(e.protected_objects))
            protected_model_name = str(
                protected_object._meta.verbose_name
            ).capitalize()
            raise ValidationError(
                message=f"{model_name} cannot be deleted while associated {protected_model_name} exists"
            )


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class OwnableModel(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name=_("User"),
    )

    class Meta:
        abstract = True

    def check_owner(self, user: settings.AUTH_USER_MODEL) -> bool:
        return self.user == user
