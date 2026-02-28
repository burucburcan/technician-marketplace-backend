.PHONY: help install dev build test lint format docker-up docker-down docker-logs clean

help:
	@echo "Available commands:"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start all development servers"
	@echo "  make build        - Build all packages"
	@echo "  make test         - Run all tests"
	@echo "  make lint         - Lint all packages"
	@echo "  make format       - Format code with Prettier"
	@echo "  make docker-up    - Start Docker services"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make docker-logs  - View Docker logs"
	@echo "  make clean        - Clean all build artifacts and dependencies"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

format:
	npm run format

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

clean:
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/*/dist
	rm -rf packages/*/build
	rm -rf packages/*/.next
	rm -rf packages/*/coverage
