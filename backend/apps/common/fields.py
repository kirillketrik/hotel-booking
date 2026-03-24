import logging

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import models


class EncryptedCharField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs["max_length"] = kwargs.get("max_length", 1000)
        super().__init__(*args, **kwargs)

        if not hasattr(settings, "DB_ENCRYPTION_KEY"):
            raise ImproperlyConfigured(
                "Добавьте DB_ENCRYPTION_KEY в settings.py"
            )

        self.fernet = Fernet(key=settings.DB_ENCRYPTION_KEY)

    def get_prep_value(self, value):
        if value == "" or value.startswith("gAAAA"):
            return value
        return self.fernet.encrypt(value.encode()).decode()

    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return value
        try:
            return self.fernet.decrypt(value.encode()).decode()
        except Exception:
            logging.getLogger(__name__).exception("Failed to decrypt field")
            return None

    def to_python(self, value):
        return super().to_python(value)
