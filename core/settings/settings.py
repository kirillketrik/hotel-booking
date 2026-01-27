from datetime import timedelta
from typing import Dict, List

from pydantic import SecretStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class SecuritySettings(BaseSettings):
    SECRET_KEY: SecretStr = Field(SecretStr("VERY_VERY_SECRET_KEY"))
    ALLOWED_HOSTS: List[str] = Field(["localhost", "127.0.0.1"])
    CORS_ALLOWED_ORIGINS: List[str] = Field(["http://localhost:3000"])
    CORS_ALLOW_CREDENTIALS: bool = Field(True)
    CSRF_TRUSTED_ORIGINS: List[str] = Field(["http://localhost:3000"])
    CSRF_COOKIE_SAMESITE: str = Field("Lax")
    SESSION_COOKIE_SAMESITE: str = Field("Lax")
    CSRF_COOKIE_SECURE: bool = Field(False)
    SESSION_COOKIE_SECURE: bool = Field(False)
    CSRF_COOKIE_HTTPONLY: bool = Field(False)


class RedisSettings(BaseSettings):
    HOST: str = Field("redis", validation_alias="REDIS_HOST")
    PORT: int = Field(6379, validation_alias="REDIS_PORT")

    @property
    def CELERY_BROKER_URL(self) -> str:
        return f"redis://{self.HOST}:{self.PORT}/0"

    @property
    def CELERY_RESULT_BACKEND(self) -> str:
        return f"redis://{self.HOST}:{self.PORT}/0"


class DatabaseSettings(BaseSettings):
    NAME: str = Field("logistic", validation_alias="POSTGRES_DB")
    USER: SecretStr = Field(SecretStr("admin"), validation_alias="POSTGRES_USER")
    PASSWORD: SecretStr = Field(SecretStr("admin"), validation_alias="POSTGRES_PASSWORD")
    HOST: str = Field("db", validation_alias="POSTGRES_HOST")
    PORT: int = Field(5432, validation_alias="POSTGRES_PORT")

    @property
    def DJANGO_DICT(self) -> Dict[str, str]:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": self.NAME,
            "USER": self.USER.get_secret_value(),
            "PASSWORD": self.PASSWORD.get_secret_value(),
            "HOST": self.HOST,
            "PORT": str(self.PORT),
        }


class MinioSettings(BaseSettings):
    ENDPOINT: str = Field("minio:9000", validation_alias="MINIO_STORAGE_ENDPOINT")
    EXTERNAL_URL: str = Field("http://localhost:9000", validation_alias="MINIO_EXTERNAL_URL")
    ACCESS_KEY: SecretStr = Field(SecretStr("admin"), validation_alias="MINIO_STORAGE_ACCESS_KEY")
    SECRET_KEY: SecretStr = Field(SecretStr("admin"), validation_alias="MINIO_STORAGE_SECRET_KEY")
    USE_HTTPS: bool = Field(False, validation_alias="MINIO_STORAGE_USE_HTTPS")
    MEDIA_BUCKET_NAME: str = Field("django-media", validation_alias="MINIO_STORAGE_MEDIA_BUCKET_NAME")
    STATIC_BUCKET_NAME: str = Field("django-static", validation_alias="MINIO_STORAGE_STATIC_BUCKET_NAME")
    AUTO_CREATE_MEDIA_BUCKET: bool = Field(True, validation_alias="MINIO_STORAGE_AUTO_CREATE_MEDIA_BUCKET")
    AUTO_CREATE_STATIC_BUCKET: bool = Field(True, validation_alias="MINIO_STORAGE_AUTO_CREATE_STATIC_BUCKET")
    STATIC_USE_PRESIGN: bool = Field(False, validation_alias="MINIO_STORAGE_STATIC_USE_PRESIGN")
    MEDIA_USE_PRESIGN: bool = Field(False, validation_alias="MINIO_STORAGE_MEDIA_USE_PRESIGN")


class AuthSettings(BaseSettings):
    JWT_SECRET_KEY: SecretStr = Field(..., validation_alias="JWT_SECRET_KEY")
    ACCESS_TOKEN_LIFETIME: int = Field(60, validation_alias="ACCESS_TOKEN_LIFETIME")
    REFRESH_TOKEN_LIFETIME: int = Field(1440, validation_alias="REFRESH_TOKEN_LIFETIME")
    ROTATE_REFRESH_TOKENS: bool = Field(True)
    BLACKLIST_AFTER_ROTATION: bool = Field(True)
    REFRESH_TOKEN_LEEWAY: int = Field(20)
    REFRESH_COOKIE: str = Field("refresh_token")
    AUTH_COOKIE: str = Field("access_token")
    AUTH_COOKIE_SECURE: bool = Field(False)
    AUTH_COOKIE_HTTPONLY: bool = Field(True)
    AUTH_COOKIE_SAMESITE: str = Field("Lax")

    @property
    def DJANGO_DICT(self) -> Dict[str, str]:
        return {
            "ACCESS_TOKEN_LIFETIME": timedelta(minutes=self.ACCESS_TOKEN_LIFETIME),
            "REFRESH_TOKEN_LIFETIME": timedelta(minutes=self.REFRESH_TOKEN_LIFETIME),
            "SIGNING_KEY": self.JWT_SECRET_KEY.get_secret_value(),
            "ROTATE_REFRESH_TOKENS": self.ROTATE_REFRESH_TOKENS,
            "BLACKLIST_AFTER_ROTATION": self.BLACKLIST_AFTER_ROTATION,
            "REFRESH_TOKEN_LEEWAY": self.REFRESH_TOKEN_LEEWAY,
            "REFRESH_COOKIE": self.REFRESH_COOKIE,
            "AUTH_COOKIE": self.AUTH_COOKIE,
            "AUTH_COOKIE_SECURE": self.AUTH_COOKIE_SECURE,
            "AUTH_COOKIE_HTTPONLY": self.AUTH_COOKIE_HTTPONLY,
            "AUTH_COOKIE_SAMESITE": self.AUTH_COOKIE_SAMESITE,
        }

    @property
    def AUTH_COOKIE_DEFAULTS(self) -> Dict[str, str]:
        return {
            "httponly": self.AUTH_COOKIE_HTTPONLY,
            "secure": self.AUTH_COOKIE_SECURE,
            "samesite": self.AUTH_COOKIE_SAMESITE,
        }


class Settings(BaseSettings):
    DEBUG: bool = True

    # Группировка
    DB: DatabaseSettings = DatabaseSettings()
    MINIO: MinioSettings = MinioSettings()
    AUTH: AuthSettings = AuthSettings()
    REDIS: RedisSettings = RedisSettings()
    SECURITY: SecuritySettings = SecuritySettings()

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        extra="ignore",
    )
