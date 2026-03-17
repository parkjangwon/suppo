#!/usr/bin/env bash
set -e

# ── .env 생성 ──────────────────────────────────────────────────────────────────
if [ -f .env ]; then
  echo ".env 파일이 이미 존재합니다. 덮어쓰지 않고 건너뜁니다."
else
  cp .env.example .env

  AUTH_SECRET=$(openssl rand -base64 32)
  TICKET_SECRET=$(openssl rand -base64 32)
  GIT_KEY=$(openssl rand -base64 32)

  sed -i.bak \
    -e "s|AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET}|" \
    -e "s|TICKET_ACCESS_SECRET=.*|TICKET_ACCESS_SECRET=${TICKET_SECRET}|" \
    -e "s|GIT_TOKEN_ENCRYPTION_KEY=.*|GIT_TOKEN_ENCRYPTION_KEY=${GIT_KEY}|" \
    .env
  rm -f .env.bak

  echo ".env 파일이 생성되었습니다 (시크릿 자동 생성 완료)."
fi

# ── 의존성 설치 ────────────────────────────────────────────────────────────────
pnpm install

# ── DB 초기화 ──────────────────────────────────────────────────────────────────
pnpm exec prisma migrate deploy
pnpm exec prisma db seed

echo ""
echo "✓ 설치 완료. 'pnpm dev' 로 서버를 시작하세요."
