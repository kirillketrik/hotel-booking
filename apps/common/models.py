import uuid6
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import deletion


class BaseModel(models.Model):
    id = models.UUIDField(
        primary_key=True, editable=False, default=uuid6.uuid7
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        try:
            return super().delete(*args, **kwargs)
        except deletion.ProtectedError as e:
            model_name = str(self._meta.verbose_name).capitalize()
            for protected_object in e.protected_objects:
                protected_object_model_name = str(
                    protected_object._meta.verbose_name
                ).capitalize()
                raise ValidationError(
                    message=f"{model_name} cannot be deleted till associated {protected_object_model_name} exists"
                )


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
