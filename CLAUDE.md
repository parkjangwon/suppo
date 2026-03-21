# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint

# Testing
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright E2E tests (starts dev server automatically)

# Database
pnpm prisma migrate dev --name <name>  # Create migration
pnpm prisma generate                   # Regenerate Prisma client after schema change
pnpm prisma studio                     # Open Prisma Studio
pnpm prisma db seed                    # Seed database

# Initial setup
./install.sh      # One-shot: copies .env, installs deps, migrates, seeds
```

## Architecture

Full-stack SaaS helpdesk built with **Next.js 15 App Router + React 19 + TypeScript**, using **SQLite + Prisma** as the database. UI is **shadcn/ui** (Radix UI primitives) with Tailwind CSS. Authentication is **NextAuth.js v5** (Credentials, Google, GitHub, SAML/BoxyHQ).

### Route Groups

- `src/app/(public)/` — Customer-facing: landing, ticket creation/lookup, knowledge base
- `src/app/(admin)/admin/` — Agent/admin dashboard: tickets, customers, settings, reports
- `src/app/api/` — API routes for comments, tickets, auth, git, AI, etc.
- `src/app/survey/` — CSAT survey flow

### Core Business Logic (`src/lib/`)

| Directory | Purpose |
|-----------|---------|
| `assignment/` | Auto-assignment algorithm (specialty matching + load balancing) |
| `tickets/` | Ticket CRUD, status transitions, SLA integration |
| `email/` | Email service with Outbox pattern for reliable delivery |
| `ai/` | Customer analysis via Ollama (local) or Google Gemini |
| `llm/` | LLM provider abstraction (Ollama, Gemini) |
| `git/` | GitHub/GitLab issue linking (tokens encrypted with AES) |
| `templates/` | Response templates with variable substitution + conditional rendering |
| `audit/` | Audit logging for all admin actions |
| `sla/` | SLA clock with pause/resume |
| `security/` | Rate limiting, JWT ticket access tokens |
| `storage/` | Local (dev) / AWS S3 (prod) file storage |
| `reports/` | Excel export via ExcelJS |
| `knowledge/` | Knowledge base articles |

### Key Patterns

- **Server Actions** are used alongside API routes — Server Actions for mutations in admin, API routes for public endpoints
- **Outbox pattern** for email delivery (`EmailDelivery` table, background processing)
- **Ticket access tokens** (JWT) allow customers to look up tickets without accounts
- **Signed cookies** track ticket lookup sessions
- **Audit logging** wraps nearly all admin mutations
- **Real-time collaboration**: presence awareness + comment locking for concurrent editing

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

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
- `next.config.ts` contains strict CSP headers — new external resources must be added there
- E2E tests run sequentially (`workers: 1`) — do not parallelize without verifying DB isolation
