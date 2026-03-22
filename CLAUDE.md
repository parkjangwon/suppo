# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev:admin    # Admin app (localhost:3001)
pnpm dev:public   # Public app (localhost:3000)
pnpm dev:all      # Admin + Public parallel dev

# Build
pnpm build:admin
pnpm build:public
pnpm build:all
pnpm start:all    # Built admin + public apps in parallel
pnpm lint

# Testing
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright E2E tests (starts admin + public automatically)

# Database
pnpm --filter=@crinity/db generate
pnpm --filter=@crinity/db migrate:dev --name <name>
pnpm --filter=@crinity/db migrate:deploy
pnpm --filter=@crinity/db studio
pnpm --filter=@crinity/db seed

# Initial setup
pnpm install
pnpm --filter=@crinity/db generate
pnpm --filter=@crinity/db migrate:dev --name init
pnpm --filter=@crinity/db seed

# Docker deployment
docker compose -f docker/docker-compose.yml --env-file docker/env/.env.production up --build -d
```

## Architecture

Full-stack SaaS helpdesk built as a **pnpm workspace monorepo** with **Next.js 15 App Router + React 19 + TypeScript**. Local development uses **SQLite + Prisma**, and production targets **LibSQL/sqld**. UI is **shadcn/ui** (Radix UI primitives) with Tailwind CSS. Authentication is **NextAuth.js v5** (Credentials, Google, GitHub, SAML/BoxyHQ).

### Apps And Packages

- `apps/public/src/` — Customer-facing app: landing, ticket creation/lookup, knowledge base, survey
- `apps/admin/src/` — Agent/admin app: dashboard, tickets, customers, settings, reports
- `packages/db/` — Prisma schema, migrations, client factory, raw DB helper
- `packages/shared/src/` — Shared auth, security, storage, tickets, knowledge, branding logic
- `packages/ui/src/components/ui/` — Shared shadcn/ui components

### Core Business Logic

| Directory | Purpose |
|-----------|---------|
| `packages/shared/src/assignment/` | Auto-assignment algorithm |
| `packages/shared/src/tickets/` | Shared ticket creation/access logic |
| `packages/shared/src/email/` | Shared email queue/outbox logic |
| `apps/admin/src/lib/ai/` | Admin AI features and insight generation |
| `apps/admin/src/lib/git/` | GitHub/GitLab issue linking |
| `apps/admin/src/lib/templates/` | Response template rendering/scoring |
| `apps/admin/src/lib/audit/` | Audit logging |
| `apps/admin/src/lib/sla/` | SLA clock logic |
| `packages/shared/src/security/` | Rate limiting, ticket access, upload validation |
| `packages/shared/src/storage/` | Local/S3 storage helpers |
| `apps/admin/src/lib/reports/` | Analytics/report generation |
| `packages/shared/src/knowledge/` | Shared knowledge base logic |

### Key Patterns

- **Server Actions** are used alongside API routes — Server Actions for mutations in admin, API routes for public endpoints
- **Outbox pattern** for email delivery (`EmailDelivery` table, background processing)
- **Ticket access tokens** (JWT) allow customers to look up tickets without accounts
- **Signed cookies** track ticket lookup sessions
- **Audit logging** wraps nearly all admin mutations
- **Real-time collaboration**: presence awareness + comment locking for concurrent editing

### Path Aliases

- In `apps/admin`, `@/*` maps to `apps/admin/src/*`
- In `apps/public`, `@/*` maps to `apps/public/src/*`
- Shared packages are imported via `@crinity/db`, `@crinity/shared/*`, `@crinity/ui/*`

## Testing

- **Unit tests** (`tests/unit/`): Vitest with jsdom — tests for assignment logic, email outbox, Git providers, agent deactivation
- **E2E tests** (`tests/e2e/specs/`): Playwright — sequential (1 worker), runs against real dev DB, auto-starts dev server
- Custom Excel reporter for E2E results (`tests/reporter/`)

## Environment

Required variables for local dev (copy from `.env.example`):
- `DATABASE_URL` — SQLite path
- `AUTH_SECRET` — 32+ char random string for NextAuth
- `TICKET_ACCESS_SECRET` — JWT signing key for ticket tokens
- `GIT_TOKEN_ENCRYPTION_KEY` — 32-byte key for Git token AES encryption
- `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` — seeded admin account

All other configuration (email provider, LLM settings, Git integration, branding) is managed via the `/admin/settings/` web interface, not env vars.

## Notes

- UI labels and in-app text are in **Korean**
- Dark mode is supported (Next Themes + Tailwind CSS variables)
- App CSP headers live in `apps/admin/next.config.ts` and `apps/public/next.config.ts`
- Docker deployment assets live under `docker/`
- E2E tests run sequentially (`workers: 1`) — do not parallelize without verifying DB isolation
