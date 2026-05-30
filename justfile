set shell := ["/bin/sh", "-cu"]

docker_compose := "docker compose"

default:
    @just --list

# Поднять окружение
up:
    {{docker_compose}} up -d

restart:
    {{docker_compose}} restart web frontend celery_worker celery_beat

# Остановить окружение
down:
    {{docker_compose}} down

# Пересобрать образы после изменения кода / Dockerfile
rebuild:
    {{docker_compose}} up -d --build web frontend celery_worker celery_beat

# Полная пересборка без cache
rebuild-clean:
    {{docker_compose}} build --no-cache web frontend celery_worker celery_beat
    {{docker_compose}} up -d web frontend celery_worker celery_beat

# Обновить backend зависимости
deps:
    cd backend && uv lock
    {{docker_compose}} build web celery_worker celery_beat
    {{docker_compose}} up -d web celery_worker celery_beat

# Тесты backend через docker
test *args:
    {{docker_compose}} exec web uv run --no-sync pytest {{args}}

# Django manage.py
manage *args:
    {{docker_compose}} exec web uv run --no-sync python manage.py {{args}}

# Миграции
migrate:
    {{docker_compose}} exec web uv run --no-sync python manage.py migrate

# Shell внутри контейнера
shell *args="sh":
    {{docker_compose}} exec web {{args}}

# Логи
logs *services="web frontend celery_worker celery_beat db redis minio":
    {{docker_compose}} logs -f {{services}}

# Frontend
frontend-install:
    cd frontend && pnpm install

frontend-lint:
    {{docker_compose}} exec frontend pnpm lint

lint:
    {{docker_compose}} exec web uv run --no-sync ruff check .
