#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

REQUIRED_NODE_MAJOR=22

log() {
  printf '\n[%s] %s\n' "$1" "$2"
}

fail() {
  printf '\n[ERROR] %s\n' "$1" >&2
  exit 1
}

warn() {
  printf '\n[WARN] %s\n' "$1"
}

on_error() {
  printf '\n[ERROR] install.sh failed at line %s\n' "$1" >&2
}

trap 'on_error "$LINENO"' ERR

require_command() {
  local command_name="$1"
  local install_hint="$2"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "${command_name} 명령을 찾을 수 없습니다. ${install_hint}"
  fi
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    return
  fi

  if ! command -v corepack >/dev/null 2>&1; then
    fail "pnpm이 없고 corepack도 없습니다. Node.js ${REQUIRED_NODE_MAJOR}+와 corepack을 설치한 뒤 다시 실행하세요."
  fi

  log INFO "pnpm이 없어 corepack으로 활성화합니다."
  corepack enable >/dev/null 2>&1 || true
  corepack prepare pnpm@10.13.1 --activate
}

ensure_node_version() {
  require_command node "Node.js ${REQUIRED_NODE_MAJOR}+를 설치하세요."

  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ]; then
    fail "Node.js ${REQUIRED_NODE_MAJOR}+가 필요합니다. 현재 버전: $(node -v)"
  fi
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr -d '\n'
  else
    node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64"))'
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

ensure_root_env() {
  if [ ! -f .env ]; then
    [ -f .env.example ] || fail ".env.example 파일이 없습니다."
    cp .env.example .env
    log INFO ".env 파일을 생성했습니다."
  else
    log INFO ".env 파일이 이미 있어 기존 값을 최대한 유지합니다."
  fi

  local database_url auth_secret ticket_secret git_key
  database_url="$(get_env_value .env DATABASE_URL)"
  auth_secret="$(get_env_value .env AUTH_SECRET)"
  ticket_secret="$(get_env_value .env TICKET_ACCESS_SECRET)"
  git_key="$(get_env_value .env GIT_TOKEN_ENCRYPTION_KEY)"

  if [ -z "$database_url" ] || [[ "$database_url" == file:./* ]] || [[ "$database_url" == file:../* ]]; then
    upsert_env_value .env DATABASE_URL "file:${ROOT_DIR}/packages/db/dev.db"
  fi

  if [ -z "$auth_secret" ] || [[ "$auth_secret" == your-secret-* ]]; then
    upsert_env_value .env AUTH_SECRET "$(generate_secret)"
  fi

  if [ -z "$ticket_secret" ] || [[ "$ticket_secret" == your-ticket-access-secret-* ]]; then
    upsert_env_value .env TICKET_ACCESS_SECRET "$(generate_secret)"
  fi

  if [ -z "$git_key" ] || [[ "$git_key" == your-32-byte-encryption-key* ]]; then
    upsert_env_value .env GIT_TOKEN_ENCRYPTION_KEY "$(generate_secret)"
  fi
}

write_app_env_files() {
  set -a
  source .env
  set +a

  upsert_env_value apps/public/.env.local DATABASE_URL "${DATABASE_URL}"
  upsert_env_value apps/public/.env.local TICKET_ACCESS_SECRET "${TICKET_ACCESS_SECRET}"
  upsert_env_value apps/public/.env.local AUTH_URL "http://localhost:3000"

  upsert_env_value apps/admin/.env.local DATABASE_URL "${DATABASE_URL}"
  upsert_env_value apps/admin/.env.local AUTH_SECRET "${AUTH_SECRET}"
  upsert_env_value apps/admin/.env.local TICKET_ACCESS_SECRET "${TICKET_ACCESS_SECRET}"
  upsert_env_value apps/admin/.env.local GIT_TOKEN_ENCRYPTION_KEY "${GIT_TOKEN_ENCRYPTION_KEY}"
  upsert_env_value apps/admin/.env.local INITIAL_ADMIN_EMAIL "${INITIAL_ADMIN_EMAIL:-admin@suppo.io}"
  upsert_env_value apps/admin/.env.local INITIAL_ADMIN_PASSWORD "${INITIAL_ADMIN_PASSWORD:-admin1234}"
  upsert_env_value apps/admin/.env.local AUTH_URL "http://localhost:3001"
}

sqlite_table_count() {
  local db_path="$1"

  if [ ! -f "$db_path" ]; then
    echo "0"
    return
  fi

  sqlite3 "$db_path" "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';" 2>/dev/null || echo "0"
}

apply_sqlite_migrations() {
  local db_path="$1"

  require_command sqlite3 "로컬 SQLite 초기화를 위해 sqlite3 CLI를 설치하세요."

  mkdir -p "$(dirname "$db_path")"
  rm -f "$db_path"

  local migration_file
  while IFS= read -r migration_file; do
    sqlite3 "$db_path" < "$migration_file"
  done < <(find packages/db/prisma/migrations -maxdepth 2 -name migration.sql | sort)
}

sync_local_database() {
  set -a
  source .env
  set +a

  log INFO "Prisma Client를 생성합니다."
  pnpm --filter=@suppo/db generate

  if [[ "${DATABASE_URL}" == http://* ]] || [[ "${DATABASE_URL}" == https://* ]]; then
    log INFO "LibSQL/원격 DB 환경으로 판단되어 migrate:deploy를 실행합니다."
    pnpm --filter=@suppo/db migrate:deploy
  else
    local db_path existing_table_count
    db_path="${DATABASE_URL#file:}"
    existing_table_count="$(sqlite_table_count "$db_path")"

    if [ "$existing_table_count" = "0" ]; then
      log INFO "비어 있는 로컬 SQLite DB라서 migration.sql을 직접 적용합니다."
      apply_sqlite_migrations "$db_path"
    else
      log INFO "기존 로컬 SQLite DB를 감지했습니다. Prisma 스키마 동기화를 시도합니다."
      if ! pnpm --filter=@suppo/db exec prisma db push --schema=./prisma/schema.prisma --skip-generate; then
        warn "Prisma db push가 실패해 기존 dev.db를 그대로 유지합니다. 스키마를 완전히 다시 만들려면 packages/db/dev.db를 삭제한 뒤 install.sh를 다시 실행하세요."
      fi
    fi
  fi

  log INFO "시드 데이터를 적용합니다."
  pnpm --filter=@suppo/db seed
}

print_success() {
  cat <<EOF

[DONE] 설치 완료
- Public: http://localhost:3000
- Admin:  http://localhost:3001/admin/login
- 기본 관리자 계정: ${INITIAL_ADMIN_EMAIL:-admin@suppo.io}
- 기본 관리자 비밀번호: ${INITIAL_ADMIN_PASSWORD:-admin1234}

시작 명령:
- pnpm dev:public
- pnpm dev:admin
- pnpm dev:all
EOF
}

ensure_node_version
ensure_pnpm
require_command python3 "python3를 설치하세요."

log INFO "환경 파일을 준비합니다."
ensure_root_env
write_app_env_files

log INFO "의존성을 설치합니다."
pnpm install
log INFO "Prisma 엔진 바이너리를 확인합니다."
pnpm rebuild @prisma/client prisma @prisma/engines || true

log INFO "데이터베이스를 준비합니다."
sync_local_database

print_success
