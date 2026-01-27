SHELL := cmd.exe
ARGS ?=

DOCKER_COMPOSE = docker compose
.PHONY: restart up down test

restart:
	$(DOCKER_COMPOSE) up -d --build web
	docker image prune -f

up:
	$(DOCKER_COMPOSE) up -d

down:
	$(DOCKER_COMPOSE) down

test:
	$(DOCKER_COMPOSE) exec web uv run pytest $(ARGS)

collectstatic:
	$(DOCKER_COMPOSE) exec web uv run manage.py collectstatic