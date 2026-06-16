.PHONY: install install-backend install-frontend install-playwright infra migrate seed backend frontend worker beat dev stop clean

BACKEND_DIR := backend
FRONTEND_DIR := frontend
PYTHON ?= python3
VENV := $(BACKEND_DIR)/.venv
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python

install: install-backend install-frontend

install-backend:
	cd $(BACKEND_DIR) && $(PYTHON) -m venv .venv
	$(PIP) install --upgrade pip
	$(PIP) install -r $(BACKEND_DIR)/requirements.txt

install-frontend:
	cd $(FRONTEND_DIR) && npm install

install-playwright:
	cd $(BACKEND_DIR) && .venv/bin/playwright install chromium

infra:
	docker compose up -d postgres redis qdrant

migrate:
	cd $(BACKEND_DIR) && .venv/bin/alembic upgrade head

seed:
	cd $(BACKEND_DIR) && .venv/bin/python scripts/seed_credit_packages.py

backend:
	cd $(BACKEND_DIR) && .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

frontend:
	cd $(FRONTEND_DIR) && npm run dev

worker:
	cd $(BACKEND_DIR) && .venv/bin/celery -A app.core.celery_app.celery_app worker --loglevel=info

beat:
	cd $(BACKEND_DIR) && .venv/bin/celery -A app.core.celery_app.celery_app beat --loglevel=info

dev:
	./scripts/dev.sh

stop:
	docker compose stop

clean:
	rm -rf $(VENV) $(FRONTEND_DIR)/.next
