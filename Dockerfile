FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_CACHE_DIR=/root/.cache/uv/python\
    UV_LINK_MODE=copy \
    UV_NO_DEV=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

COPY . .

RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev

EXPOSE 8000

CMD ["uv", "run", "manage.py", "migrate"]
CMD ["uv", "run", "uvicorn", "core.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info", "--proxy-headers"]