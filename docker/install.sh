#!/usr/bin/env bash
set -Eeuo pipefail

DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${DOCKER_DIR}/.." && pwd)"
ENV_FILE="${DOCKER_DIR}/env/.env.production"
ENV_EXAMPLE_FILE="${DOCKER_DIR}/env/.env.production.example"
COMPOSE_FILE="${DOCKER_DIR}/docker-compose.yml"
MODE="all-in-one"

PREPARE_ONLY=0

log() {
  printf '\n[%s] %s\n' "$1" "$2"
}

warn() {
  printf '\n[WARN] %s\n' "$1"
}

fail() {
  printf '\n[ERROR] %s\n' "$1" >&2
  exit 1
}

on_error() {
  printf '\n[ERROR] docker/install.sh failed at line %s\n' "$1" >&2
}

trap 'on_error "$LINENO"' ERR

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --prepare-only)
        PREPARE_ONLY=1
        ;;
      --mode)
        MODE="${2:-}"
        shift
        ;;
      --help|-h)
        cat <<'EOF'
Usage: ./docker/install.sh [--prepare-only] [--mode all-in-one|backend]

Options:
  --prepare-only   Prepare the selected env file and validate it, but do not run docker compose up.
  --mode           Deployment mode. `all-in-one` uses compose nginx, `backend` exposes public/admin without a bundled reverse proxy.
EOF
        exit 0
        ;;
      *)
        fail "알 수 없는 옵션입니다: $1"
        ;;
    esac
    shift
  done
}

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "${command_name} 명령을 찾을 수 없습니다. ${install_hint}"
  fi
}

configure_mode() {
  case "$MODE" in
    all-in-one|"")
      MODE="all-in-one"
      ENV_FILE="${DOCKER_DIR}/env/.env.production"
      ENV_EXAMPLE_FILE="${DOCKER_DIR}/env/.env.production.example"
      COMPOSE_FILE="${DOCKER_DIR}/docker-compose.yml"
      ;;
    backend)
      MODE="backend"
      ENV_FILE="${DOCKER_DIR}/env/.env.backend"
      ENV_EXAMPLE_FILE="${DOCKER_DIR}/env/.env.backend.example"
      COMPOSE_FILE="${DOCKER_DIR}/docker-compose.backend.yml"
      ;;
    *)
      fail "--mode 값은 all-in-one 또는 backend 여야 합니다."
      ;;
  esac
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr -d '\n'
  else
    python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(32), end="")
PY
  fi
}

get_env_value() {
  local file="$1"
  local key="$2"

  if [ ! -f "$file" ]; then
    return
  fi

  awk -F= -v search_key="$key" '$1 == search_key { value = substr($0, index($0, "=") + 1) } END { if (value != "") print value }' "$file"
}

upsert_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"

  mkdir -p "$(dirname "$file")"
  touch "$file"

  if grep -q -E "^${key}=" "$file"; then
    python3 - "$file" "$key" "$value" <<'PY'
from pathlib import Path
import sys

file_path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]

lines = file_path.read_text().splitlines()
updated = False
for idx, line in enumerate(lines):
    if line.startswith(f"{key}="):
        lines[idx] = f"{key}={value}"
        updated = True

if not updated:
    lines.append(f"{key}={value}")

file_path.write_text("\n".join(lines) + "\n")
PY
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

ensure_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    [ -f "$ENV_EXAMPLE_FILE" ] || fail "${ENV_EXAMPLE_FILE} 파일이 없습니다."
    cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
    log INFO "${ENV_FILE} 파일을 생성했습니다."
  else
    log INFO "${ENV_FILE} 파일이 이미 있어 기존 값을 최대한 유지합니다."
  fi
}

ensure_local_defaults() {
  local public_url admin_url auth_secret ticket_secret git_key admin_email admin_password
  local enable_tls http_port https_port backend_bind_ip public_app_port admin_app_port
  local applied_local_defaults=0

  public_url="$(get_env_value "$ENV_FILE" PUBLIC_URL)"
  admin_url="$(get_env_value "$ENV_FILE" ADMIN_URL)"
  auth_secret="$(get_env_value "$ENV_FILE" AUTH_SECRET)"
  ticket_secret="$(get_env_value "$ENV_FILE" TICKET_ACCESS_SECRET)"
  git_key="$(get_env_value "$ENV_FILE" GIT_TOKEN_ENCRYPTION_KEY)"
  admin_email="$(get_env_value "$ENV_FILE" INITIAL_ADMIN_EMAIL)"
  admin_password="$(get_env_value "$ENV_FILE" INITIAL_ADMIN_PASSWORD)"
  enable_tls="$(get_env_value "$ENV_FILE" ENABLE_TLS)"
  http_port="$(get_env_value "$ENV_FILE" NGINX_HTTP_PORT)"
  https_port="$(get_env_value "$ENV_FILE" NGINX_HTTPS_PORT)"
  backend_bind_ip="$(get_env_value "$ENV_FILE" BACKEND_BIND_IP)"
  public_app_port="$(get_env_value "$ENV_FILE" PUBLIC_APP_PORT)"
  admin_app_port="$(get_env_value "$ENV_FILE" ADMIN_APP_PORT)"

  if [ "$MODE" = "backend" ]; then
    if [ -z "$public_url" ] || [ "$public_url" = "https://helpdesk.company.com" ]; then
      upsert_env_value "$ENV_FILE" PUBLIC_URL "http://localhost:3000"
    fi

    if [ -z "$admin_url" ] || [ "$admin_url" = "https://admin.company.com" ]; then
      upsert_env_value "$ENV_FILE" ADMIN_URL "http://localhost:3001"
    fi

    if [ -z "$backend_bind_ip" ]; then
      upsert_env_value "$ENV_FILE" BACKEND_BIND_IP "127.0.0.1"
    fi

    if [ -z "$public_app_port" ]; then
      upsert_env_value "$ENV_FILE" PUBLIC_APP_PORT "3000"
    fi

    if [ -z "$admin_app_port" ]; then
      upsert_env_value "$ENV_FILE" ADMIN_APP_PORT "3001"
    fi
  else
    if [ -z "$public_url" ] || [ "$public_url" = "https://helpdesk.company.com" ]; then
      upsert_env_value "$ENV_FILE" PUBLIC_URL "http://localhost:8080"
      applied_local_defaults=1
    fi

    if [ -z "$admin_url" ] || [ "$admin_url" = "https://admin.company.com" ]; then
      upsert_env_value "$ENV_FILE" ADMIN_URL "http://admin.localhost:8080"
      applied_local_defaults=1
    fi

    if [ "$applied_local_defaults" = "1" ]; then
      if [ -z "$enable_tls" ] || [ "$enable_tls" = "1" ]; then
        upsert_env_value "$ENV_FILE" ENABLE_TLS "0"
      fi
      if [ -z "$http_port" ] || [ "$http_port" = "80" ]; then
        upsert_env_value "$ENV_FILE" NGINX_HTTP_PORT "8080"
      fi
      if [ -z "$https_port" ] || [ "$https_port" = "443" ]; then
        upsert_env_value "$ENV_FILE" NGINX_HTTPS_PORT "8443"
      fi
    fi
  fi

  if [ -z "$auth_secret" ] || [[ "$auth_secret" == \<* ]] || [[ "$auth_secret" == your-* ]]; then
    upsert_env_value "$ENV_FILE" AUTH_SECRET "$(generate_secret)"
  fi

  if [ -z "$ticket_secret" ] || [[ "$ticket_secret" == \<* ]] || [[ "$ticket_secret" == your-* ]]; then
    upsert_env_value "$ENV_FILE" TICKET_ACCESS_SECRET "$(generate_secret)"
  fi

  if [ -z "$git_key" ] || [[ "$git_key" == \<* ]] || [[ "$git_key" == your-* ]]; then
    upsert_env_value "$ENV_FILE" GIT_TOKEN_ENCRYPTION_KEY "$(generate_secret)"
  fi

  if [ -z "$admin_email" ] || [ "$admin_email" = "admin@company.com" ] || [ "$admin_email" = "admin@admin.localhost" ]; then
    upsert_env_value "$ENV_FILE" INITIAL_ADMIN_EMAIL "admin@suppo.io"
  fi

  if [ -z "$admin_password" ] || [[ "$admin_password" == \<* ]] || [ "$admin_email" = "admin@company.com" ] || [ "$admin_email" = "admin@admin.localhost" ]; then
    upsert_env_value "$ENV_FILE" INITIAL_ADMIN_PASSWORD "admin1234"
  fi

  if [ -z "$(get_env_value "$ENV_FILE" AUTO_BOOTSTRAP)" ]; then
    upsert_env_value "$ENV_FILE" AUTO_BOOTSTRAP "if-empty"
  fi

  if [ -z "$(get_env_value "$ENV_FILE" SEED_PROFILE)" ]; then
    upsert_env_value "$ENV_FILE" SEED_PROFILE "none"
  fi
}

validate_env() {
  log INFO "${ENV_FILE} 구성을 검증합니다."
  python3 - "$ENV_FILE" <<'PY'
from pathlib import Path
from urllib.parse import urlparse
import sys

env_path = Path(sys.argv[1])
values: dict[str, str] = {}

for raw_line in env_path.read_text().splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    values[key] = value

def require(key: str) -> str:
    value = values.get(key, "")
    if not value:
      raise SystemExit(f"{key} is required in {env_path}")
    return value

def validate_url(key: str) -> None:
    value = require(key)
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise SystemExit(f"{key} must be a valid http/https URL")

validate_url("PUBLIC_URL")
validate_url("ADMIN_URL")

if values["PUBLIC_URL"] == values["ADMIN_URL"]:
    raise SystemExit("PUBLIC_URL and ADMIN_URL must be different")

for key in ("AUTH_SECRET", "TICKET_ACCESS_SECRET", "GIT_TOKEN_ENCRYPTION_KEY"):
    value = require(key)
    if len(value) < 32:
        raise SystemExit(f"{key} must be at least 32 characters")

require("INITIAL_ADMIN_EMAIL")
require("INITIAL_ADMIN_PASSWORD")
PY
}

start_stack() {
  (
    cd "$ROOT_DIR"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d
  )
}

print_success() {
  local public_url admin_url admin_email
  public_url="$(get_env_value "$ENV_FILE" PUBLIC_URL)"
  admin_url="$(get_env_value "$ENV_FILE" ADMIN_URL)"
  admin_email="$(get_env_value "$ENV_FILE" INITIAL_ADMIN_EMAIL)"

  cat <<EOF

[DONE] Docker 환경 준비 완료
- Mode: ${MODE}
- Compose file: ${COMPOSE_FILE}
- Env file: ${ENV_FILE}
- Public URL: ${public_url}
- Admin URL:  ${admin_url}
- Admin Email: ${admin_email}
EOF

  printf '%s\n' "- Admin Password: ${ENV_FILE} 값을 사용합니다."

  if [ "$PREPARE_ONLY" = "1" ]; then
    cat <<EOF

다음 명령으로 실제 컨테이너를 기동하세요:
- docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} up --build -d
EOF
    return
  fi

  cat <<EOF

로그 확인:
- docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} logs -f
EOF
}

parse_args "$@"
configure_mode
require_command docker "Docker Desktop 또는 Docker Engine을 설치하세요."
require_command python3 "python3를 설치하세요."

if ! docker compose version >/dev/null 2>&1; then
  fail "docker compose 플러그인을 사용할 수 없습니다. Docker Compose v2를 확인하세요."
fi

ensure_env_file
ensure_local_defaults
validate_env

if [ "$PREPARE_ONLY" = "0" ]; then
  log INFO "Docker Compose 스택을 기동합니다."
  start_stack
else
  log INFO "--prepare-only 모드라 Docker Compose 기동은 건너뜁니다."
fi

print_success
