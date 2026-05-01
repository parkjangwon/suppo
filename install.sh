#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

REQUIRED_NODE_MAJOR=22
LOCAL_POSTGRES_CONTAINER="${LOCAL_POSTGRES_CONTAINER:-suppo-dev-postgres}"
LOCAL_POSTGRES_IMAGE="${LOCAL_POSTGRES_IMAGE:-postgres:17-alpine}"
LOCAL_POSTGRES_VOLUME="${LOCAL_POSTGRES_VOLUME:-suppo_dev_pg_data}"
SKIP_INSTALL=0

log() {
  printf '\n[%s] %s\n' "$1" "$2"
}

fail() {
  printf '\n[ERROR] %s\n' "$1" >&2
  exit 1
}

for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=1 ;;
    *) fail "알 수 없는 옵션입니다: ${arg}" ;;
  esac
done

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

ensure_node_version() {
  require_command node "Node.js ${REQUIRED_NODE_MAJOR}+를 설치하세요."

  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ]; then
    fail "Node.js ${REQUIRED_NODE_MAJOR}+가 필요합니다. 현재 버전: $(node -v)"
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
  corepack prepare pnpm@10.33.0 --activate
}

load_env() {
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
}

db_part() {
  local part="$1"
  node -e '
const url = new URL(process.env.DATABASE_URL);
const part = process.argv[1];
if (part === "protocol") process.stdout.write(url.protocol.replace(":", ""));
if (part === "host") process.stdout.write(url.hostname);
if (part === "port") process.stdout.write(url.port || "5432");
if (part === "user") process.stdout.write(decodeURIComponent(url.username || "suppo"));
if (part === "password") process.stdout.write(decodeURIComponent(url.password || ""));
if (part === "database") process.stdout.write(url.pathname.replace(/^\//, "") || "suppo");
' "$part"
}

wait_for_tcp() {
  local host="$1"
  local port="$2"
  local timeout_seconds="${3:-30}"

  HOST="$host" PORT="$port" TIMEOUT_SECONDS="$timeout_seconds" node <<'JS'
const net = require("node:net");
const host = process.env.HOST;
const port = Number(process.env.PORT);
const deadline = Date.now() + Number(process.env.TIMEOUT_SECONDS) * 1000;

function probe(resolve, reject) {
  const socket = net.createConnection({ host, port });
  socket.setTimeout(1000);
  socket.once("connect", () => {
    socket.destroy();
    resolve();
  });
  socket.once("error", retry);
  socket.once("timeout", retry);

  function retry() {
    socket.destroy();
    if (Date.now() >= deadline) {
      reject(new Error(`Timed out waiting for ${host}:${port}`));
      return;
    }
    setTimeout(() => probe(resolve, reject), 500);
  }
}

new Promise(probe).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
JS
}

tcp_available() {
  local host="$1"
  local port="$2"

  HOST="$host" PORT="$port" node <<'JS' >/dev/null 2>&1
const net = require("node:net");
const socket = net.createConnection({ host: process.env.HOST, port: Number(process.env.PORT) });
socket.setTimeout(500);
socket.once("connect", () => {
  socket.destroy();
  process.exit(0);
});
socket.once("error", () => process.exit(1));
socket.once("timeout", () => {
  socket.destroy();
  process.exit(1);
});
JS
}

is_local_host() {
  case "$1" in
    localhost|127.0.0.1|::1) return 0 ;;
    *) return 1 ;;
  esac
}

ensure_local_postgres() {
  local protocol host port user password database
  protocol="$(db_part protocol)"
  host="$(db_part host)"
  port="$(db_part port)"
  user="$(db_part user)"
  password="$(db_part password)"
  database="$(db_part database)"

  if [ "$protocol" != "postgresql" ] && [ "$protocol" != "postgres" ]; then
    fail "DATABASE_URL은 postgresql:// 또는 postgres:// 이어야 합니다. 현재: ${DATABASE_URL}"
  fi

  if tcp_available "$host" "$port"; then
    log INFO "PostgreSQL 연결 포트가 열려 있습니다: ${host}:${port}"
    return
  fi

  if ! is_local_host "$host"; then
    fail "PostgreSQL에 연결할 수 없습니다: ${host}:${port}. 원격 DB를 먼저 준비하거나 DATABASE_URL을 수정하세요."
  fi

  require_command docker "로컬 PostgreSQL 자동 실행에는 Docker가 필요합니다."

  if docker ps -a --format '{{.Names}}' | grep -qx "$LOCAL_POSTGRES_CONTAINER"; then
    log INFO "기존 로컬 PostgreSQL 컨테이너를 시작합니다: ${LOCAL_POSTGRES_CONTAINER}"
    docker start "$LOCAL_POSTGRES_CONTAINER" >/dev/null
  else
    log INFO "로컬 PostgreSQL 컨테이너를 생성합니다: ${LOCAL_POSTGRES_CONTAINER}"
    docker run -d \
      --name "$LOCAL_POSTGRES_CONTAINER" \
      -e POSTGRES_DB="$database" \
      -e POSTGRES_USER="$user" \
      -e POSTGRES_PASSWORD="$password" \
      -p "127.0.0.1:${port}:5432" \
      -v "${LOCAL_POSTGRES_VOLUME}:/var/lib/postgresql/data" \
      "$LOCAL_POSTGRES_IMAGE" >/dev/null
  fi

  wait_for_tcp "$host" "$port" 45
}

sync_local_database() {
  load_env

  log INFO "PostgreSQL을 준비합니다."
  ensure_local_postgres

  log INFO "Prisma Client를 생성합니다."
  pnpm --filter=@suppo/db generate

  log INFO "Prisma migration을 적용합니다."
  pnpm --filter=@suppo/db migrate:deploy

  log INFO "초기 데이터를 부트스트랩합니다."
  AUTO_BOOTSTRAP="${AUTO_BOOTSTRAP:-if-empty}" SEED_PROFILE="${SEED_PROFILE:-demo}" pnpm --filter=@suppo/db bootstrap
}

print_success() {
  load_env

  cat <<EOF

[DONE] 설치 완료
- Public: http://localhost:3000
- Admin:  http://localhost:3001/admin/login
- 기본 관리자 계정: ${INITIAL_ADMIN_EMAIL:-admin@suppo.io}
- 기본 관리자 비밀번호: ${INITIAL_ADMIN_PASSWORD:-admin1234}

시작 명령:
- pnpm dev:all
- docker compose up -d
EOF
}

ensure_node_version
ensure_pnpm

log INFO "환경 파일을 준비합니다."
node scripts/ensure-local-env.mjs

if [ "$SKIP_INSTALL" = "0" ]; then
  log INFO "의존성을 설치합니다."
  pnpm install --frozen-lockfile

  log INFO "Prisma 엔진 바이너리를 확인합니다."
  pnpm rebuild @prisma/client prisma @prisma/engines || true
fi

log INFO "데이터베이스를 준비합니다."
sync_local_database

print_success
