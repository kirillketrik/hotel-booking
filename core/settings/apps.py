MY_APPS = [
    "apps.users",
]

SIDE_LOADED_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "minio_storage",
]

DJANGO_CONTRIB_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

ALL_APPS = MY_APPS + SIDE_LOADED_APPS + DJANGO_CONTRIB_APPS
