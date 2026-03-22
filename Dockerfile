FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── 의존성 설치 (빌드용 — devDeps 포함)
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── 프로덕션 전용 의존성 (런타임 이미지용 — devDeps 제외)
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ── 빌드
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 빌드 시점 더미값 (ARG는 최종 이미지에 남지 않음 — ENV와 달리 보안 경고 없음)
# 런타임 실제값은 docker-compose environment: 블록에서 주입
ARG AUTH_SECRET="build-time-placeholder-secret-not-for-production-use"
ARG TICKET_ACCESS_SECRET="build-time-placeholder-ticket-secret-not-used"
ARG GIT_TOKEN_ENCRYPTION_KEY="build-time-placeholder-encryption-key-x"
ARG DATABASE_URL="file:///dev/null"
ENV AUTH_SECRET=$AUTH_SECRET \
    TICKET_ACCESS_SECRET=$TICKET_ACCESS_SECRET \
    GIT_TOKEN_ENCRYPTION_KEY=$GIT_TOKEN_ENCRYPTION_KEY \
    DATABASE_URL=$DATABASE_URL
RUN pnpm prisma generate
RUN pnpm build
# 빌드 완료 후 민감 ENV 초기화 (runner 스테이지에서 덮어씌워짐)
ENV AUTH_SECRET="" TICKET_ACCESS_SECRET="" GIT_TOKEN_ENCRYPTION_KEY="" DATABASE_URL=""

# ── 마이그레이션 전용 스테이지 (운영 마이그레이션 시 사용)
FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY package.json ./
# 마이그레이션 실행: DATABASE_URL 환경변수 주입 후 deploy
CMD ["pnpm", "prisma", "migrate", "deploy"]

# ── 런타임 (최소 이미지)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# pnpm 가상 스토어의 symlink 구조는 Next.js standalone 트레이서와 호환되지 않음
# (standalone이 symlink를 실제 디렉토리로 전개하여 동일 경로 충돌 발생)
# 해결: deps의 전체 node_modules(symlink 원본)를 사용하고,
#       standalone에서는 server.js와 .next/만 선택적으로 복사
COPY --from=prod-deps /app/node_modules ./node_modules
# Prisma 클라이언트는 builder 스테이지에서만 생성됨 (prod-deps에는 prisma CLI 없음)
# pnpm 가상 스토어 경로는 pnpm-lock.yaml에 고정되어 있으므로 직접 복사
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@6.19.2_prisma@6.19.2_typescript@5.9.3__typescript@5.9.3/node_modules/.prisma \
                    ./node_modules/.pnpm/@prisma+client@6.19.2_prisma@6.19.2_typescript@5.9.3__typescript@5.9.3/node_modules/.prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
# standalone의 서버 진입점 및 서버사이드 번들만 복사 (node_modules 제외)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/server.js ./server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/.next ./.next
# 정적 파일은 standalone에 미포함, 별도 복사 필요
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
