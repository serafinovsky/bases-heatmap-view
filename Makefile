.PHONY: build dev help install patch minor major release tags lint lint-fix format format-check check

.PHONY: test coverage


help:
	@echo "Available commands:"
	@echo "  make install      - Install dependencies"
	@echo "  make build        - Build the plugin for production"
	@echo "  make dev          - Build and watch for changes"
	@echo "  make lint         - Check code style with ESLint"
	@echo "  make lint-fix     - Fix code style issues automatically"
	@echo "  make format       - Format code with Prettier"
	@echo "  make format-check - Check code formatting"
	@echo "  make check        - Run lint and format checks"

	@echo "  make test         - Run tests"
	@echo "  make coverage     - Run tests with coverage report"

	@echo "  make patch        - Bump patch version (0.0.x)"
	@echo "  make minor        - Bump minor version (0.x.0)"
	@echo "  make major        - Bump major version (x.0.0)"
	@echo "  make release      - Push commits and tags to remote"
	@echo "  make tags         - List git tags"

install:
	npm install

build:
	npm run build

dev:
	npm run dev

lint:
	npm run lint

lint-fix:
	npm run lint -- --fix

format:
	npm run format

format-check:
	npm run format:check

check:
	npm run check


test:
	npm run test

coverage:
	npm run test:coverage


patch: check
	npm version patch

minor: check
	npm version minor

major: check
	npm version major

release: test check
	git push origin HEAD --follow-tags

tags:
	git tag --list
