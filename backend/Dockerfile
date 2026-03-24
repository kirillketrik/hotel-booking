FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# 1. Сначала копируем только файлы зависимостей
COPY pyproject.toml uv.lock ./

# 2. Устанавливаем зависимости (включая granian, если он в pyproject.toml)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# 3. Копируем исходный код
COPY . .

# 4. Финальная синхронизация проекта
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

EXPOSE 8000

# Запускаем миграции И сервер одной командой через sh
CMD ["sh", "-c", "python manage.py migrate && granian --interface asginl --host 0.0.0.0 --port 8000 core.asgi:application"]