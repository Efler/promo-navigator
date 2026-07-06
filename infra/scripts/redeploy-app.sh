#!/usr/bin/env bash
set -euo pipefail

# Manual server-side redeploy entrypoint for GitHub Actions or direct SSH usage.

TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 <backend|frontend|both>" >&2
  exit 1
fi

case "$TARGET" in
  backend|frontend|both)
    ;;
  *)
    echo "Unsupported target: $TARGET" >&2
    echo "Expected one of: backend, frontend, both" >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.deploy.yml"
ENV_FILE="$REPO_ROOT/.env.deploy"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing deploy env file: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing compose file: $COMPOSE_FILE" >&2
  exit 1
fi

cd "$REPO_ROOT"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Tracked git changes detected on the server. Aborting redeploy to avoid overwriting local edits." >&2
  git status --short
  exit 1
fi

read_env_value() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2- || true)"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

BACKEND_IMAGE_TAG="$(read_env_value BACKEND_IMAGE)"
FRONTEND_IMAGE_TAG="$(read_env_value FRONTEND_IMAGE)"
VITE_LLM_RECOMMENDATIONS_ENABLED="$(
  read_env_value VITE_LLM_RECOMMENDATIONS_ENABLED
)"
BACKEND_IMAGE_TAG="${BACKEND_IMAGE_TAG:-promo-constructor-backend:latest}"
FRONTEND_IMAGE_TAG="${FRONTEND_IMAGE_TAG:-promo-constructor-frontend:latest}"
VITE_LLM_RECOMMENDATIONS_ENABLED="${VITE_LLM_RECOMMENDATIONS_ENABLED:-true}"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

echo "==> Updating repository to origin/$DEPLOY_BRANCH"
git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

echo "==> Ensuring PostgreSQL stays available"
"${COMPOSE[@]}" up -d pc_postgres

remove_backend() {
  echo "==> Removing backend container"
  "${COMPOSE[@]}" rm -sf pc_backend
}

remove_frontend() {
  echo "==> Removing frontend container"
  "${COMPOSE[@]}" rm -sf pc_frontend
}

build_backend() {
  echo "==> Building backend image: $BACKEND_IMAGE_TAG"
  docker build -t "$BACKEND_IMAGE_TAG" ./backend
}

build_frontend() {
  echo "==> Building frontend image: $FRONTEND_IMAGE_TAG"
  docker build \
    --build-arg "VITE_LLM_RECOMMENDATIONS_ENABLED=$VITE_LLM_RECOMMENDATIONS_ENABLED" \
    -t "$FRONTEND_IMAGE_TAG" \
    ./frontend
}

run_migrations() {
  echo "==> Running Alembic migrations"
  "${COMPOSE[@]}" run --rm pc_backend alembic upgrade head
}

start_backend() {
  echo "==> Starting backend container"
  "${COMPOSE[@]}" up -d pc_backend
}

start_frontend() {
  echo "==> Starting frontend container"
  "${COMPOSE[@]}" up -d pc_frontend
}

case "$TARGET" in
  backend)
    remove_backend
    build_backend
    run_migrations
    start_backend
    ;;
  frontend)
    remove_frontend
    build_frontend
    start_frontend
    ;;
  both)
    remove_frontend
    remove_backend
    build_backend
    run_migrations
    build_frontend
    echo "==> Starting backend and frontend containers"
    "${COMPOSE[@]}" up -d pc_backend pc_frontend
    ;;
esac

echo "==> Current service status"
"${COMPOSE[@]}" ps
