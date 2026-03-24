from pathlib import Path

from config.env import Settings

BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS = Settings()

SECRET_KEY = SETTINGS.SECURITY.SECRET_KEY.get_secret_value()
DB_ENCRYPTION_KEY = SETTINGS.SECURITY.DB_ENCRYPTION_KEY.get_secret_value()
DEBUG = SETTINGS.DEBUG
ALLOWED_HOSTS = SETTINGS.SECURITY.ALLOWED_HOSTS
CORS_ALLOWED_ORIGINS = SETTINGS.SECURITY.CORS_ALLOWED_ORIGINS
CORS_ALLOW_CREDENTIALS = SETTINGS.SECURITY.CORS_ALLOW_CREDENTIALS
CSRF_TRUSTED_ORIGINS = SETTINGS.SECURITY.CSRF_TRUSTED_ORIGINS

INSTALLED_APPS = [
    # Side loaded
    "daphne",
    "channels",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "minio_storage",
    "django_filters",
    # Django contrib
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Project apps
    "apps.users",
    "apps.tours",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {"default": SETTINGS.DB.DJANGO_DICT}

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.users.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "100/day", "user": "1000/day"},
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "apps.common.utils.handle_django_validation_error",
    "JWT_AUTH_HTTPONLY": False,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Hotel booking API",
    "DESCRIPTION": "API documentation",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

SIMPLE_JWT = SETTINGS.AUTH.DJANGO_DICT

CSRF_COOKIE_HTTPONLY = SETTINGS.SECURITY.CSRF_COOKIE_HTTPONLY

AUTH_USER_MODEL = "users.User"

MINIO_STORAGE_ENDPOINT = SETTINGS.MINIO.ENDPOINT
MINIO_STORAGE_EXTERNAL_URL = SETTINGS.MINIO.EXTERNAL_URL
MINIO_STORAGE_ACCESS_KEY = SETTINGS.MINIO.ACCESS_KEY.get_secret_value()
MINIO_STORAGE_SECRET_KEY = SETTINGS.MINIO.SECRET_KEY.get_secret_value()
MINIO_STORAGE_USE_HTTPS = SETTINGS.MINIO.USE_HTTPS
MINIO_STORAGE_MEDIA_BUCKET_NAME = SETTINGS.MINIO.MEDIA_BUCKET_NAME
MINIO_STORAGE_STATIC_BUCKET_NAME = SETTINGS.MINIO.STATIC_BUCKET_NAME
MINIO_STORAGE_AUTO_CREATE_MEDIA_BUCKET = (
    SETTINGS.MINIO.AUTO_CREATE_MEDIA_BUCKET
)
MINIO_STORAGE_AUTO_CREATE_STATIC_BUCKET = (
    SETTINGS.MINIO.AUTO_CREATE_STATIC_BUCKET
)
MINIO_STORAGE_STATIC_USE_PRESIGN = SETTINGS.MINIO.STATIC_USE_PRESIGN
MINIO_STORAGE_MEDIA_USE_PRESIGN = SETTINGS.MINIO.MEDIA_USE_PRESIGN
MINIO_STORAGE_URL_PROTOCOL = "http"

STATIC_URL = (
    f"{SETTINGS.MINIO.EXTERNAL_URL}/{SETTINGS.MINIO.STATIC_BUCKET_NAME}/"
)
MEDIA_URL = (
    f"{SETTINGS.MINIO.EXTERNAL_URL}/{SETTINGS.MINIO.MEDIA_BUCKET_NAME}/"
)

STORAGES = {
    "default": {
        "BACKEND": "minio_storage.storage.MinioMediaStorage",
        "OPTIONS": {
            "base_url": f"{SETTINGS.MINIO.EXTERNAL_URL}/{SETTINGS.MINIO.MEDIA_BUCKET_NAME}/",
        },
    },
    "staticfiles": {
        "BACKEND": "minio_storage.storage.MinioStaticStorage",
        "OPTIONS": {
            "base_url": f"{SETTINGS.MINIO.EXTERNAL_URL}/{SETTINGS.MINIO.STATIC_BUCKET_NAME}/",
        },
    },
}

CELERY_BROKER_URL = SETTINGS.REDIS.CELERY_BROKER_URL
CELERY_RESULT_BACKEND = SETTINGS.REDIS.CELERY_RESULT_BACKEND
CELERY_BEAT_SCHEDULE = {
    "flush-expired-tokens": {
        "task": "apps.users.tasks.flush_expired_tokens",
        "schedule": 86400,  # daily, in seconds
    },
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(SETTINGS.REDIS.HOST, SETTINGS.REDIS.PORT)],
        },
    },
}
