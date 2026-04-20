FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/public/package.json ./apps/public/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/public/package.json ./apps/public/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod

FROM base AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/admin/src/lib/system/seed-functions.ts ./apps/admin/src/lib/system/seed-functions.ts
COPY packages/db/package.json ./packages/db/
COPY packages/db/prisma ./packages/db/prisma
COPY packages/db/src ./packages/db/src
COPY package.json pnpm-workspace.yaml ./
CMD ["pnpm", "--filter=@suppo/db", "migrate:deploy"]

FROM base AS builder
ARG APP_NAME
ARG AUTH_SECRET="build-time-placeholder"
ARG DATABASE_URL="file:./packages/db/dev.db"
ARG TICKET_ACCESS_SECRET="build-time-placeholder"
ARG GIT_TOKEN_ENCRYPTION_KEY="build-time-placeholder-32byte-xx"
ENV AUTH_SECRET=$AUTH_SECRET \
    DATABASE_URL=$DATABASE_URL \
    TICKET_ACCESS_SECRET=$TICKET_ACCESS_SECRET \
    GIT_TOKEN_ENCRYPTION_KEY=$GIT_TOKEN_ENCRYPTION_KEY
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter=@suppo/db generate
RUN pnpm --filter=@suppo/${APP_NAME} build
ENV AUTH_SECRET="" DATABASE_URL="" TICKET_ACCESS_SECRET="" GIT_TOKEN_ENCRYPTION_KEY=""

FROM base AS runner
ARG APP_NAME
ENV APP_NAME=$APP_NAME \
    NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD node apps/$APP_NAME/server.js
