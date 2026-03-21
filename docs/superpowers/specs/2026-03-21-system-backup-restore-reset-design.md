# System Backup / Restore / Reset — Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Project:** crinity-helpdesk

---

## Overview

Add three system-management capabilities to the admin settings UI:

1. **Selective Reset** — restore chosen data categories to initial seed state
2. **Full Backup** — download all data + attachments as a single ZIP
3. **Full Restore** — upload a backup ZIP and overwrite all current data

---

## API

All endpoints require `ADMIN` role (checked via `auth()`). All mutations are recorded in `AuditLog`.

### `GET /api/admin/system/backup`

Streams a ZIP file download containing all database tables (JSON) and the upload directory (`UPLOAD_DIR` env, defaults to `public/uploads/`).

**Response:**
- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="backup-{ISO-timestamp}.zip"`

**Implementation:** Use `archiver` to pipe ZIP stream directly to the response — avoids buffering the entire archive in memory.

### `POST /api/admin/system/restore`

Accepts a `multipart/form-data` upload with a single `file` field (ZIP). Read via `request.formData()` (Next.js 15 App Router native Web API — no `formidable` needed). Maximum body size must be raised from the default 4 MB via `export const maxRequestBodySize = '600mb'` in the route file.

**Flow:**
1. Parse ZIP using `unzipper` (streaming extraction — avoids loading large archives into memory)
2. Read and validate `manifest.json` (schema version check)
3. Within a Prisma transaction: delete all rows in FK-safe dependency order, then re-insert from JSON
4. After transaction commits: atomically swap attachments directory
   - Write extracted files to a temp directory (`public/uploads_restore_tmp/`)
   - Rename current `public/uploads/` → `public/uploads_backup_tmp/`
   - Rename `public/uploads_restore_tmp/` → `public/uploads/`
   - Delete `public/uploads_backup_tmp/`
   - On failure at any step: restore from `public/uploads_backup_tmp/` if present
5. Return `200 OK` — client redirects to `/auth/signin`

**Error responses:**
- `400` — invalid ZIP or incompatible manifest version
- `413` — ZIP exceeds 500 MB limit
- `500` — transaction failure (DB rolled back, attachments untouched); or file swap failure (DB is in restored state but attachments rollback attempted)

### `POST /api/admin/system/reset`

Body: `{ categories: string[] }` where each value is one of the reset category keys.

**Flow:**
1. Validate that at least one category is selected (`400` otherwise)
2. Validate FK safety: if `settings` is selected without `tickets`, reject — `Category` cannot be deleted while tickets reference it. Frontend enforces this; backend validates too.
3. Delete rows for each selected category in dependency order (Prisma transaction)
4. Re-run seed data for selected categories (extracted seed functions — see Implementation Notes)
5. Return `200 OK`

---

## Backup ZIP Structure

```
backup-2026-03-21T12-00-00.zip
├── manifest.json
├── data/
│   ├── agents.json
│   ├── customers.json
│   ├── tickets.json
│   ├── comments.json
│   ├── attachments_meta.json
│   ├── categories.json
│   ├── teams.json
│   ├── team_members.json
│   ├── agent_categories.json
│   ├── agent_absences.json
│   ├── request_types.json
│   ├── response_templates.json
│   ├── custom_field_definitions.json
│   ├── custom_field_values.json
│   ├── sla_policies.json
│   ├── sla_clocks.json
│   ├── automation_rules.json
│   ├── knowledge_categories.json
│   ├── knowledge_articles.json
│   ├── knowledge_article_feedback.json
│   ├── audit_logs.json
│   ├── generated_reports.json
│   ├── report_schedules.json
│   ├── email_settings.json
│   ├── email_deliveries.json
│   ├── email_thread_mappings.json
│   ├── llm_settings.json
│   ├── system_branding.json
│   ├── saml_providers.json
│   ├── git_provider_credentials.json
│   ├── git_links.json
│   ├── git_events.json
│   ├── git_operation_queues.json
│   ├── notification_settings.json
│   ├── business_calendars.json
│   ├── holidays.json
│   ├── saved_filters.json
│   ├── ticket_activities.json
│   ├── ticket_presences.json
│   ├── ticket_comment_locks.json
│   ├── ticket_merges.json
│   ├── ticket_transfers.json
│   ├── customer_satisfactions.json
│   ├── time_entries.json
│   └── csat_surveys.json
└── attachments/
    └── (mirror of public/uploads/ directory tree)
```

### `manifest.json`

```json
{
  "version": "1.0",
  "schemaVersion": "20260321000000",
  "createdAt": "2026-03-21T12:00:00.000Z",
  "appVersion": "1.0.0",
  "tables": ["agents", "customers", "tickets", "..."]
}
```

`schemaVersion` matches the latest Prisma migration timestamp (read from `_prisma_migrations` table at backup time). On restore, if `schemaVersion` does not match, a warning toast is shown and the user can force-proceed.

---

## Reset Categories

| Key | Label (Korean) | Tables cleared | Seed re-applied |
|-----|----------------|----------------|-----------------|
| `tickets` | 티켓 및 고객 데이터 | Ticket, Customer, Comment, Attachment, TicketActivity, TicketPresence, TicketCommentLock, TicketMerge, TicketTransfer, CustomerSatisfaction, GitLink, GitEvent, GitOperationQueue, TimeEntry, EmailDelivery, EmailThreadMapping, SLAClock, CustomFieldValue | No seed |
| `agents` | 상담원 계정 | Agent (except initial admin), AgentAbsence, AgentCategory, TeamMember, Team, NotificationSetting | Re-seed initial admin |
| `settings` | 설정 | LLMSettings, EmailSettings, SystemBranding, SAMLProvider, GitProviderCredential, BusinessCalendar, Holiday, SLAPolicy, AutomationRule, RequestType, ResponseTemplate, CustomFieldDefinition, Category, SavedFilter | Re-seed defaults |
| `knowledge` | 지식 베이스 | KnowledgeCategory, KnowledgeArticle, KnowledgeArticleFeedback | No seed |
| `audit_logs` | 감사 로그 | AuditLog, GeneratedReport, ReportSchedule | No seed |

**FK constraint rules** (enforced on both frontend and backend — backend returns `400` on violation):

| If selected | Must also select | Reason |
|-------------|------------------|--------|
| `settings` | `tickets` | `Category` → `Ticket` (`Restrict`); `ResponseTemplate.createdById` → `Agent` (`Restrict`) — must also select `agents` |
| `agents` | `tickets` + `knowledge` + `settings` | `KnowledgeArticle.authorId/lastEditedById` → `Agent` (`Restrict`); `TicketTransfer.fromAgentId/toAgentId` → `Agent` (`Restrict`); `ResponseTemplate.createdById` → `Agent` (`Restrict`) |

**Simplified UI rule:** Selecting `agents` automatically forces selection of `tickets`, `knowledge`, and `settings`. Selecting `settings` automatically forces selection of `tickets`. These dependencies are shown as explanatory notes in the UI.

**Initial admin preservation:** When `agents` is selected, the initial admin is always recreated using `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` env vars. The seed functions must read these env vars directly (the current `prisma/seed.ts` hardcodes `admin@crinity.io` / `admin123` — this will be updated as part of implementation to read env vars with those as fallback defaults).

---

## UI

### Location

New page: `/admin/settings/system`
New sidebar entry: **시스템** (system icon) — added to the existing settings nav.

### Page Layout

Three card sections, top to bottom:

#### 1. 데이터 백업

- Description: "현재 모든 데이터와 첨부파일을 ZIP 파일로 다운로드합니다."
- Button: **백업 다운로드** → triggers `GET /api/admin/system/backup`
- Shows progress spinner during download

#### 2. 데이터 복구

- Description + warning: "백업 파일을 업로드하면 현재 모든 데이터가 교체됩니다. 이 작업은 되돌릴 수 없습니다."
- File input (`.zip` only)
- Button: **복구 시작** → confirmation dialog → `POST /api/admin/system/restore`
- On success: redirect to `/auth/signin` with `?reason=restored` showing a toast

#### 3. 시스템 초기화

- Description: "선택한 항목을 초기 설치 상태로 되돌립니다."
- Checkbox list (5 items from reset categories table above)
- Note shown when `settings` is checked: "`설정` 초기화는 `티켓 및 고객 데이터`도 함께 초기화합니다."
- "모두 선택" toggle
- Button: **초기화** (destructive/red) — disabled until ≥1 checkbox checked
- Confirmation dialog: user must type `초기화` to confirm
- On success: toast + page reload

### Confirmation Dialog (Reset)

```
[경고] 선택한 데이터가 영구 삭제됩니다.

계속하려면 아래에 "초기화"를 입력하세요.

[입력창]

[취소] [초기화 실행 (빨간 버튼)]
```

---

## Restore Transaction Order

FK dependency order derived from the Prisma schema. Tables are deleted children-first and inserted parents-first.

**Delete order (children first):**
```
KnowledgeArticleFeedback
KnowledgeArticle
KnowledgeCategory
GeneratedReport     ← must precede Agent (ReportSchedule.createdById → Agent cascade)
ReportSchedule      ← must precede Agent (cascade); GeneratedReport.scheduleId is SetNull so order above is safe
AuditLog
CustomerSatisfaction
TicketMerge
TicketTransfer
TicketActivity
TicketPresence
TicketCommentLock
TimeEntry
GitOperationQueue   ← child of GitLink / Agent
GitEvent
GitLink
EmailDelivery
EmailThreadMapping
Comment
Attachment
CustomFieldValue
SLAClock            ← child of Ticket and SLAPolicy; deleted before both
Ticket
SavedFilter         ← FK to Agent (cascade); deleted before Agent
AgentAbsence
AgentCategory
NotificationSetting
TeamMember
Team
Agent
Customer
AutomationRule
SLAPolicy
Holiday
BusinessCalendar
CustomFieldDefinition
ResponseTemplate
RequestType
GitProviderCredential
SAMLProvider
SystemBranding
LLMSettings
EmailSettings
Category
```

**Insert order:** exact reverse of delete order.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Restore ZIP > 500 MB | Reject with `413` before parsing |
| Invalid ZIP format | `400` with message |
| Schema version mismatch | Warning toast, user can force-proceed |
| Transaction failure | `500`, DB rolled back, attachments untouched |
| File swap failure after DB commit | Attempt rollback from `uploads_backup_tmp/`; log error |
| Reset `settings` without `tickets` | `400` backend + auto-check UI enforcement |
| Reset with 0 categories | Button disabled (frontend) + `400` (backend) |
| Concurrent restore/reset | Not handled (admin-only, acceptable) |

---

## Implementation Notes

- **ZIP creation (backup):** `archiver` npm package — pipes stream to response.
- **ZIP extraction (restore):** `unzipper` npm package — streaming extraction avoids loading large archives into memory. Both `archiver` and `unzipper` must be added to dependencies.
- **Backup DB consistency (SQLite WAL):** Wrap all `findMany` calls during backup inside a single Prisma `$transaction` with `isolationLevel` omitted (SQLite uses serializable by default). This ensures all table reads see the same snapshot and prevents torn backups from concurrent writes.
- **Attachment directory:** `process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads')` — consistent with `src/lib/storage/local-storage.ts`.
- **Attachment atomic swap:** write to temp dir → rename current → rename temp → delete old backup dir. On any failure, restore from backup dir.
- **Body size limit:** Set `experimental: { serverActions: { bodySizeLimit: '600mb' } }` in `next.config.ts` (Next.js 15 App Router — this is the correct mechanism, not a per-route export). Use streaming (`unzipper`) to avoid buffering the full upload in memory.
- **Request parsing:** Use `request.formData()` natively — no `formidable` needed.
- **Seed extraction:** Refactor `prisma/seed.ts` into `prisma/seed-functions.ts` exporting `seedInitialAdmin()`, `seedDefaultSettings()` etc., each reading `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD` from env with hardcoded fallbacks. `seed.ts` calls these functions; reset API calls them selectively.
- **Schema version:** Read latest migration name from `_prisma_migrations` table via `prisma.$queryRaw`.

---

## Out of Scope

- Scheduled/automatic backups
- Cloud storage for backups (S3 etc.)
- Partial/selective restore
- Backup encryption
