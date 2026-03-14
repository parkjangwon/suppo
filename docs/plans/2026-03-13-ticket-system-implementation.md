# Ticket System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the v1 Crinity ticket system described in `docs/superpowers/specs/2026-03-13-ticket-system-design.md` as a Next.js 15 monolith with customer and admin flows, auto-assignment, notifications, attachments, and Git linking.

**Architecture:** Start from the current docs-only workspace and bootstrap a single Next.js App Router application. Keep business logic in `src/lib/**` service modules, keep Route Handlers and Server Actions thin, use Prisma/PostgreSQL for source-of-truth state, and add a DB-backed email outbox so notification failures never block ticket workflows. Public ticket detail access should be protected by a signed cookie minted after a successful ticket-number-plus-email lookup.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Prisma ORM, PostgreSQL, NextAuth.js v5, Zod, React Hook Form, Nodemailer, AWS SDK v3, Vitest, Playwright, Docker Compose

---

## Assumptions And Required Clarifications

- The workspace is currently greenfield, so the plan includes project bootstrap work before feature work.
- Use `pnpm` as the package manager unless the team standard changes before implementation starts.
- Add auth tables required by NextAuth (`User`, `Account`, `Session`, `VerificationToken`) plus a 1:1 `Agent` profile table. This keeps OAuth support simple while preserving the business-facing `Agent` entity from the spec.
- Add `GitProviderCredential`, `NotificationSetting`, and `EmailDelivery` models even though they are not explicitly listed in the spec. They are required to support encrypted Git tokens, admin settings, retryable email delivery, and failure logging.
- Treat “current processing” load for assignment as tickets in `OPEN`, `IN_PROGRESS`, or `WAITING`.
- `AWS CodeCommit SDK` cannot create or search native issues because CodeCommit does not provide an issue tracker API. Implement the provider abstraction for GitHub and GitLab first, and pause before promising full CodeCommit parity until the desired AWS target is clarified.
- This directory is not currently a Git repository. Replace each “Commit” step with a local checkpoint until Git is initialized.

### Task 1: Bootstrap The Next.js Monolith And Test Harness

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/(public)/page.tsx`
- Create: `tests/e2e/public-home.spec.ts`
- Create: `tests/setup/vitest.setup.ts`

**Step 1: Write the failing smoke test**

```ts
import { test, expect } from "@playwright/test";

test("public landing shows create and lookup actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "티켓 작성" })).toBeVisible();
  await expect(page.getByRole("link", { name: "티켓 조회" })).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/public-home.spec.ts`
Expected: FAIL because the Next.js app and Playwright config do not exist yet.

**Step 3: Write minimal implementation**

```tsx
export default function HomePage() {
  return (
    <main>
      <a href="/ticket/new">티켓 작성</a>
      <a href="/ticket/lookup">티켓 조회</a>
    </main>
  );
}
```

Also bootstrap the Next.js app, add scripts for `dev`, `build`, `lint`, `test`, `test:e2e`, and wire Vitest + Playwright.

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm exec playwright test tests/e2e/public-home.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add package.json tsconfig.json next.config.ts eslint.config.mjs postcss.config.mjs vitest.config.ts playwright.config.ts src/app tests
git commit -m "chore: bootstrap ticket system app"
```

### Task 2: Establish Route Groups, Shells, And Shared UI Foundation

**Files:**

- Create: `src/app/(public)/layout.tsx`
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/(admin)/admin/login/page.tsx`
- Create: `src/components/app/public-shell.tsx`
- Create: `src/components/app/admin-shell.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/lib/utils.ts`
- Create: `tests/e2e/route-shells.spec.ts`

**Step 1: Write the failing shell test**

```ts
test("admin login and public routes render different shells", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await expect(page.getByText("상담원 로그인")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Crinity Support")).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm exec playwright test tests/e2e/route-shells.spec.ts`
Expected: FAIL because route groups and layouts are not implemented.

**Step 3: Write minimal implementation**

```tsx
export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
```

Add route-group layouts, a minimal admin login page shell, and the first shared shadcn-compatible primitives so later screens can be composed instead of re-styled ad hoc.

**Step 4: Run test to verify it passes**

Run: `pnpm lint && pnpm exec playwright test tests/e2e/route-shells.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add src/app src/components src/lib/utils.ts tests/e2e/route-shells.spec.ts
git commit -m "feat: add app shells and shared ui foundation"
```

### Task 3: Model The Database Schema, Prisma Client, And Seed Data

**Files:**

- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db/client.ts`
- Create: `src/lib/db/queries/categories.ts`
- Create: `src/lib/db/queries/agents.ts`
- Create: `tests/integration/db/schema.spec.ts`

**Step 1: Write the failing persistence test**

```ts
it("persists a ticket with category, assignee, and activity log", async () => {
  const created = await createTicketFixture();
  expect(created.ticket.ticketNumber).toMatch(/^CRN-/);
  expect(created.activity.action).toBe("CREATED");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/db/schema.spec.ts`
Expected: FAIL because Prisma models, migrations, and fixtures do not exist.

**Step 3: Write minimal implementation**

```prisma
model Ticket {
  id           String   @id @default(cuid())
  ticketNumber String   @unique
  subject      String
  status       TicketStatus @default(OPEN)
  createdAt    DateTime @default(now())
}
```

Expand the schema to include the full spec models plus:

- `User`, `Account`, `Session`, `VerificationToken`
- `GitProviderCredential`
- `NotificationSetting`
- `EmailDelivery`

Then generate the initial migration, seed default categories, an admin user, and sample agents.

**Step 4: Run test to verify it passes**

Run: `pnpm prisma migrate dev && pnpm prisma db seed && pnpm vitest run tests/integration/db/schema.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add prisma src/lib/db tests/integration/db/schema.spec.ts
git commit -m "feat: add prisma schema and seed data"
```

### Task 4: Implement Authentication, Sessions, And Role Guards

**Files:**

- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/lib/auth/config.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/guards.ts`
- Create: `src/middleware.ts`
- Create: `tests/integration/auth/guards.spec.ts`
- Create: `tests/e2e/admin-login.spec.ts`

**Step 1: Write the failing auth tests**

```ts
it("blocks anonymous access to /admin/dashboard", async () => {
  const result = await requireBackofficeSession(mockAnonymousRequest());
  expect(result.allowed).toBe(false);
});
```

```ts
test("agent can sign in and reach dashboard", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("이메일").fill("agent@example.com");
  await page.getByLabel("비밀번호").fill("password123");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/auth/guards.spec.ts && pnpm exec playwright test tests/e2e/admin-login.spec.ts`
Expected: FAIL because NextAuth and route guards are not configured.

**Step 3: Write minimal implementation**

```ts
export function requireAssignedOrAdmin(
  session: BackofficeSession,
  assigneeId: string | null,
) {
  return session.role === "ADMIN" || session.agentId === assigneeId;
}
```

Configure Credentials + Google + GitHub providers, map authenticated users to active `Agent` profiles, enforce admin-route protection in middleware, and centralize role/ownership guards so API handlers do not duplicate permission logic.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/auth/guards.spec.ts && pnpm exec playwright test tests/e2e/admin-login.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add src/auth.ts src/app/api/auth src/lib/auth src/middleware.ts tests/integration/auth tests/e2e/admin-login.spec.ts
git commit -m "feat: add auth and role guards"
```

### Task 5: Build Ticket Numbering, Auto-Assignment, And Activity Logging

**Files:**

- Create: `src/lib/assignment/pick-assignee.ts`
- Create: `src/lib/tickets/create-ticket.ts`
- Create: `src/lib/tickets/activity.ts`
- Create: `src/lib/tickets/ticket-number.ts`
- Create: `tests/unit/assignment/pick-assignee.spec.ts`
- Create: `tests/integration/tickets/create-ticket.spec.ts`

**Step 1: Write the failing domain tests**

```ts
it("prefers the least-loaded specialist and breaks ties by oldest assignment", () => {
  const assignee = pickAssignee(buildCandidatePool());
  expect(assignee?.id).toBe("agent-specialist-b");
});
```

```ts
it("creates an unassigned ticket when every candidate is at capacity", async () => {
  const result = await createTicket(buildCreateInput());
  expect(result.ticket.assigneeId).toBeNull();
  expect(result.activities.some((entry) => entry.action === "ASSIGNED")).toBe(
    false,
  );
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/assignment/pick-assignee.spec.ts tests/integration/tickets/create-ticket.spec.ts`
Expected: FAIL because the assignment service and ticket creation flow do not exist.

**Step 3: Write minimal implementation**

```ts
export function pickAssignee(candidates: CandidateAgent[]) {
  return (
    candidates
      .filter((candidate) => candidate.loadRatio < 1)
      .sort(
        (a, b) =>
          a.loadRatio - b.loadRatio ||
          a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime(),
      )[0] ?? null
  );
}
```

Implement:

- `CRN-${nanoid(10)}` ticket numbers
- category-affinity filtering
- load-based assignment with `lastAssignedAt` tie-break
- fallback to unassigned tickets
- `TicketActivity` rows for `CREATED`, `ASSIGNED`, `STATUS_CHANGED`, `TRANSFERRED`, and `PRIORITY_CHANGED`

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/assignment/pick-assignee.spec.ts tests/integration/tickets/create-ticket.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add src/lib/assignment src/lib/tickets tests/unit/assignment tests/integration/tickets
git commit -m "feat: add ticket creation and assignment services"
```

### Task 6: Deliver Public Ticket Submission With Validation, CAPTCHA, Rate Limits, And Attachments

**Files:**

- Create: `src/app/(public)/ticket/new/page.tsx`
- Create: `src/app/(public)/ticket/submitted/page.tsx`
- Create: `src/app/api/tickets/route.ts`
- Create: `src/lib/security/rate-limit.ts`
- Create: `src/lib/security/captcha.ts`
- Create: `src/lib/storage/attachment-service.ts`
- Create: `src/lib/storage/local-storage.ts`
- Create: `src/lib/storage/s3-storage.ts`
- Create: `src/lib/validation/ticket.ts`
- Create: `tests/integration/api/public-ticket-create.spec.ts`
- Create: `tests/e2e/public-ticket-create.spec.ts`

**Step 1: Write the failing submission tests**

```ts
it("rejects files over 10MB and more than 20 attachments", async () => {
  const response = await submitTicket(buildOversizedTicketPayload());
  expect(response.status).toBe(400);
});
```

```ts
test("public user can submit a ticket and see the issued number", async ({
  page,
}) => {
  await page.goto("/ticket/new");
  await page.getByLabel("이름").fill("Kim Customer");
  await page.getByRole("button", { name: "제출" }).click();
  await expect(page.getByText(/CRN-/)).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/api/public-ticket-create.spec.ts && pnpm exec playwright test tests/e2e/public-ticket-create.spec.ts`
Expected: FAIL because the public form, API, CAPTCHA, and file storage adapters do not exist.

**Step 3: Write minimal implementation**

```ts
export const ticketSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  subject: z.string().min(1),
  description: z.string().min(1),
});
```

Implement:

- public ticket form
- `POST /api/tickets`
- IP-based rate limiting (`5/min`)
- Turnstile or hCaptcha verification wrapper
- attachment validation for MIME, size, and per-ticket count
- local-vs-S3 storage adapter selection

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/api/public-ticket-create.spec.ts && pnpm exec playwright test tests/e2e/public-ticket-create.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add src/app/(public)/ticket src/app/api/tickets src/lib/security src/lib/storage src/lib/validation tests/integration/api/public-ticket-create.spec.ts tests/e2e/public-ticket-create.spec.ts
git commit -m "feat: add public ticket submission flow"
```

### Task 7: Implement Secure Ticket Lookup, Public Thread View, And Customer Replies

**Files:**

- Create: `src/app/(public)/ticket/lookup/page.tsx`
- Create: `src/app/(public)/ticket/[number]/page.tsx`
- Create: `src/app/api/tickets/lookup/route.ts`
- Create: `src/app/api/comments/public/route.ts`
- Create: `src/lib/security/ticket-access.ts`
- Create: `src/lib/tickets/public-thread.ts`
- Create: `tests/integration/api/public-ticket-lookup.spec.ts`
- Create: `tests/e2e/public-ticket-thread.spec.ts`

**Step 1: Write the failing lookup/thread tests**

```ts
it("returns a ticket only when number and email match", async () => {
  const response = await lookupTicket({
    ticketNumber: "CRN-ABC",
    email: "wrong@example.com",
  });
  expect(response.status).toBe(404);
});
```

```ts
test("customer cannot see internal notes in the public thread", async ({
  page,
}) => {
  await page.goto("/ticket/lookup");
  await page.getByLabel("티켓 번호").fill("CRN-VALID123");
  await page.getByLabel("이메일").fill("customer@example.com");
  await page.getByRole("button", { name: "조회" }).click();
  await expect(page.getByText("내부 메모")).toHaveCount(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/api/public-ticket-lookup.spec.ts && pnpm exec playwright test tests/e2e/public-ticket-thread.spec.ts`
Expected: FAIL because lookup, signed access cookies, and public comment APIs do not exist.

**Step 3: Write minimal implementation**

```ts
export async function issueTicketAccessCookie(
  ticketNumber: string,
  email: string,
) {
  return sign({ ticketNumber, email }, process.env.TICKET_ACCESS_SECRET!);
}
```

Implement:

- `/ticket/lookup` lookup form and result redirect
- signed, short-lived ticket-access cookie after successful lookup
- `/ticket/[number]` public thread page
- customer follow-up comments with optional attachments
- filtering so `isInternal` comments never reach public queries

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/api/public-ticket-lookup.spec.ts && pnpm exec playwright test tests/e2e/public-ticket-thread.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add src/app/(public)/ticket/lookup src/app/(public)/ticket/[number] src/app/api/tickets/lookup src/app/api/comments/public src/lib/security/ticket-access.ts src/lib/tickets/public-thread.ts tests/integration/api/public-ticket-lookup.spec.ts tests/e2e/public-ticket-thread.spec.ts
git commit -m "feat: add customer lookup and reply flow"
```

### Task 8: Ship Admin Ticket List, Detail Actions, Comments, And Internal Notes

**Files:**

- Create: `src/app/(admin)/admin/tickets/page.tsx`
- Create: `src/app/(admin)/admin/tickets/[id]/page.tsx`
- Create: `src/app/api/tickets/[id]/route.ts`
- Create: `src/app/api/comments/route.ts`
- Create: `src/components/admin/ticket-filters.tsx`
- Create: `src/components/admin/ticket-list.tsx`
- Create: `src/components/admin/ticket-detail.tsx`
- Create: `src/lib/db/queries/admin-tickets.ts`
- Create: `tests/integration/api/admin-ticket-actions.spec.ts`
- Create: `tests/e2e/admin-ticket-workflow.spec.ts`

**Step 1: Write the failing backoffice workflow tests**

```ts
it("allows an assignee to change status and add an internal note", async () => {
  const response = await patchTicketAsAssignedAgent();
  expect(response.status).toBe(200);
  expect(response.body.comment.isInternal).toBe(true);
});
```

```ts
test("agent sees paginated ticket list with filters", async ({ page }) => {
  await signInAsAgent(page);
  await page.goto("/admin/tickets");
  await expect(page.getByLabel("상태 필터")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/api/admin-ticket-actions.spec.ts && pnpm exec playwright test tests/e2e/admin-ticket-workflow.spec.ts`
Expected: FAIL because admin ticket pages, cursor queries, and mutation handlers are not implemented.

**Step 3: Write minimal implementation**

```ts
export async function listTickets(input: TicketListInput) {
  return prisma.ticket.findMany({
    take: input.limit ?? 20,
    orderBy: { createdAt: "desc" },
  });
}
```

Implement:

- cursor-based pagination (default 20)
- filtering by status, category, priority, assignee
- search by ticket number, subject, customer email
- detail view with status/priority changes
- agent/customer comments
- internal notes with distinct styling
- ownership checks so non-admin agents only mutate their assigned tickets

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/api/admin-ticket-actions.spec.ts && pnpm exec playwright test tests/e2e/admin-ticket-workflow.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add src/app/(admin)/admin/tickets src/app/api/tickets/[id] src/app/api/comments src/components/admin src/lib/db/queries/admin-tickets.ts tests/integration/api/admin-ticket-actions.spec.ts tests/e2e/admin-ticket-workflow.spec.ts
git commit -m "feat: add admin ticket list and detail workflows"
```

### Task 9: Add Ticket Transfer, Agent Management, Category Affinity, And Deactivation Reassignment

**Files:**

- Create: `src/app/(admin)/admin/agents/page.tsx`
- Create: `src/app/api/agents/route.ts`
- Create: `src/app/api/agents/[id]/deactivate/route.ts`
- Create: `src/lib/agents/transfer-ticket.ts`
- Create: `src/lib/agents/deactivate-agent.ts`
- Create: `src/lib/agents/save-agent.ts`
- Create: `tests/integration/agents/transfer-and-deactivate.spec.ts`
- Create: `tests/e2e/admin-agents.spec.ts`

**Step 1: Write the failing transfer/deactivation tests**

```ts
it("records transfer history and reassigns when an agent is deactivated", async () => {
  const result = await deactivateAgentAndRebalance();
  expect(result.transferHistoryCount).toBeGreaterThan(0);
  expect(result.unassignedCount).toBeGreaterThanOrEqual(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/agents/transfer-and-deactivate.spec.ts && pnpm exec playwright test tests/e2e/admin-agents.spec.ts`
Expected: FAIL because transfer services, deactivation logic, and admin agent screens do not exist.

**Step 3: Write minimal implementation**

```ts
export async function transferTicket(
  ticketId: string,
  fromAgentId: string,
  toAgentId: string,
  reason?: string,
) {
  return prisma.ticketTransfer.create({
    data: { ticketId, fromAgentId, toAgentId, reason },
  });
}
```

Implement:

- transfer UI and API
- `TicketTransfer` history rows
- agent CRUD for admins
- agent category expertise management
- reassignment of incomplete tickets on deactivation
- fallback to unassigned tickets plus admin notification when no replacement exists

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/agents/transfer-and-deactivate.spec.ts && pnpm exec playwright test tests/e2e/admin-agents.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add src/app/(admin)/admin/agents src/app/api/agents src/lib/agents tests/integration/agents tests/e2e/admin-agents.spec.ts
git commit -m "feat: add ticket transfer and agent management"
```

### Task 10: Build Dashboard Metrics, Response Templates, And Admin Settings

**Files:**

- Create: `src/app/(admin)/admin/dashboard/page.tsx`
- Create: `src/app/(admin)/admin/templates/page.tsx`
- Create: `src/app/(admin)/admin/settings/page.tsx`
- Create: `src/app/api/templates/route.ts`
- Create: `src/app/api/settings/route.ts`
- Create: `src/lib/db/queries/dashboard.ts`
- Create: `src/lib/settings/save-settings.ts`
- Create: `tests/integration/dashboard/dashboard-queries.spec.ts`
- Create: `tests/e2e/admin-dashboard.spec.ts`

**Step 1: Write the failing dashboard/settings tests**

```ts
it("returns 30-day metrics grouped by status and category", async () => {
  const metrics = await getDashboardMetrics();
  expect(metrics.defaultWindowDays).toBe(30);
  expect(metrics.statusBreakdown.OPEN).toBeGreaterThanOrEqual(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/dashboard/dashboard-queries.spec.ts && pnpm exec playwright test tests/e2e/admin-dashboard.spec.ts`
Expected: FAIL because dashboard queries, settings persistence, and template screens are missing.

**Step 3: Write minimal implementation**

```ts
export async function getDashboardMetrics() {
  return {
    defaultWindowDays: 30,
    statusBreakdown: await countTicketsByStatus(),
  };
}
```

Implement:

- today / week / month intake metrics
- unassigned count
- average first-response and resolution time
- per-agent and per-category breakdowns
- response template CRUD
- settings storage for notification emails, categories, and Git provider configuration metadata

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/dashboard/dashboard-queries.spec.ts && pnpm exec playwright test tests/e2e/admin-dashboard.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add src/app/(admin)/admin/dashboard src/app/(admin)/admin/templates src/app/(admin)/admin/settings src/app/api/templates src/app/api/settings src/lib/db/queries/dashboard.ts src/lib/settings tests/integration/dashboard tests/e2e/admin-dashboard.spec.ts
git commit -m "feat: add dashboard templates and settings"
```

### Task 11: Add Email Outbox, Provider Adapters, And Retry Handling

**Files:**

- Create: `src/lib/email/enqueue.ts`
- Create: `src/lib/email/process-outbox.ts`
- Create: `src/lib/email/providers/nodemailer.ts`
- Create: `src/lib/email/providers/resend.ts`
- Create: `src/lib/email/providers/ses.ts`
- Create: `src/lib/email/renderers.ts`
- Create: `src/app/api/internal/email-dispatch/route.ts`
- Create: `tests/unit/email/outbox.spec.ts`
- Create: `tests/integration/email/dispatch.spec.ts`

**Step 1: Write the failing notification tests**

```ts
it("keeps ticket creation successful even when email delivery fails", async () => {
  const result = await createTicketWithFailingEmailProvider();
  expect(result.ticketCreated).toBe(true);
  expect(result.outbox.status).toBe("PENDING");
});
```

```ts
it("stops retrying after three attempts with exponential backoff", async () => {
  const delivery = await processFailingEmailDelivery();
  expect(delivery.attemptCount).toBe(3);
  expect(delivery.status).toBe("FAILED");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/email/outbox.spec.ts tests/integration/email/dispatch.spec.ts`
Expected: FAIL because there is no email queue, provider abstraction, or retry logic.

**Step 3: Write minimal implementation**

```ts
export function nextRetryAt(attemptCount: number, now = new Date()) {
  return new Date(now.getTime() + 2 ** attemptCount * 60_000);
}
```

Implement:

- outbox rows for each notification event
- provider adapter selection by environment
- retry scheduling up to three attempts
- failure logging for admin visibility
- protected dispatch route for cron or worker execution

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/email/outbox.spec.ts tests/integration/email/dispatch.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add src/lib/email src/app/api/internal/email-dispatch tests/unit/email tests/integration/email
git commit -m "feat: add resilient email delivery pipeline"
```

### Task 12: Implement Git Provider Settings, Token Encryption, And Issue Linking

**Files:**

- Create: `src/lib/crypto/encrypt.ts`
- Create: `src/lib/git/provider.ts`
- Create: `src/lib/git/providers/github.ts`
- Create: `src/lib/git/providers/gitlab.ts`
- Create: `src/lib/git/providers/codecommit.ts`
- Create: `src/app/api/git/credentials/route.ts`
- Create: `src/app/api/git/issues/search/route.ts`
- Create: `src/app/api/git/issues/create/route.ts`
- Create: `src/app/api/git/links/route.ts`
- Create: `tests/integration/git/providers.spec.ts`
- Create: `tests/e2e/admin-git-linking.spec.ts`

**Step 1: Write the failing Git integration tests**

```ts
it("encrypts stored provider tokens with AES-256-GCM", async () => {
  const stored = await saveGitCredential("GITHUB", "secret-token");
  expect(stored.encryptedToken).not.toContain("secret-token");
});
```

```ts
it("creates and links a GitHub issue from a ticket", async () => {
  const result = await createLinkedIssue(buildGitHubTicket());
  expect(result.link.provider).toBe("GITHUB");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/integration/git/providers.spec.ts && pnpm exec playwright test tests/e2e/admin-git-linking.spec.ts`
Expected: FAIL because encrypted credential storage and provider clients are not implemented.

**Step 3: Write minimal implementation**

```ts
export interface GitProvider {
  searchIssues(input: SearchIssuesInput): Promise<GitIssueSummary[]>;
  createIssue(input: CreateIssueInput): Promise<GitIssueSummary>;
}
```

Implement:

- AES-256-GCM encrypt/decrypt utilities using `GIT_TOKEN_ENCRYPTION_KEY`
- provider settings save/load
- GitHub issue search/create
- GitLab issue search/create
- `GitLink` persistence and ticket-detail rendering
- a `codecommit.ts` placeholder that returns a typed “not supported until clarified” error unless product requirements change

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/integration/git/providers.spec.ts && pnpm exec playwright test tests/e2e/admin-git-linking.spec.ts`
Expected: PASS for GitHub and GitLab coverage; CodeCommit tests should assert the explicit unsupported error.

**Step 5: Commit / checkpoint**

```bash
git add src/lib/crypto src/lib/git src/app/api/git tests/integration/git tests/e2e/admin-git-linking.spec.ts
git commit -m "feat: add git provider integration"
```

### Task 13: Finish Dockerized Local Development And Full-System Verification

**Files:**

- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `tests/e2e/full-regression.spec.ts`
- Create: `README.md`

**Step 1: Write the failing system verification test**

```ts
test("customer and agent can complete the core ticket lifecycle", async ({
  browser,
}) => {
  const context = await browser.newContext();
  expect(context).toBeTruthy();
});
```

Document the full regression sequence in the spec order:

- customer creates ticket
- customer receives ticket number
- agent sees assignment
- agent replies and changes status
- customer lookup shows updated thread
- transfer flow works
- Git link appears

**Step 2: Run test to verify it fails**

Run: `docker-compose up -d && pnpm exec playwright test tests/e2e/full-regression.spec.ts`
Expected: FAIL because containers, env wiring, and the full journey are not ready.

**Step 3: Write minimal implementation**

```yaml
services:
  db:
    image: postgres:16
```

Implement:

- PostgreSQL + app services in `docker-compose.yml`
- production-minded `Dockerfile`
- `.env.example` with auth, DB, mail, storage, CAPTCHA, and encryption variables
- full regression Playwright flow
- README setup and verification instructions

**Step 4: Run test to verify it passes**

Run: `docker-compose up -d && pnpm prisma migrate deploy && pnpm exec playwright test tests/e2e/full-regression.spec.ts`
Expected: PASS

**Step 5: Commit / checkpoint**

```bash
git add Dockerfile docker-compose.yml .env.example README.md tests/e2e/full-regression.spec.ts
git commit -m "chore: add docker workflow and regression coverage"
```

## Execution Notes

- Recommended implementation order is exactly the task order above because each step unlocks the next dependency.
- Do not start Git provider parity work for CodeCommit until product confirms what “issue” means in AWS.
- Keep route handlers thin. Validation should live in `src/lib/validation/**`, and business rules should live in `src/lib/**`.
- Prefer integration tests around services and Route Handlers over mocking Prisma everywhere. The assignment, email backoff, and permission rules are the highest-risk areas.

Plan complete and saved to `docs/plans/2026-03-13-ticket-system-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
