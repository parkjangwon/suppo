# 프로젝트 하네스

## 상태

- run_mode: bootstrap
- bootstrap_status: configured
- sync_status: healthy
- Durable contract lives in `PROJECT_HARNESS.md` and `harness-contract.json`.
- Runtime interview/audit state lives in `harness-runtime.json`.
- Treat `/make-harness` as a single entry command: bootstrap when no harness exists, update when a healthy harness exists, and repair when drift or breakage is detected first.

## 기준 모델

- `PROJECT_HARNESS.md`: human-readable durable contract
- `harness-contract.json`: machine-readable durable contract
- `harness-runtime.json`: volatile interview, audit, and sync state
- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`: thin projections only

## 에이전트 기본 원칙

- Inspect the repository before asking for metadata that can be inferred.
- Confirm durable project defaults, project-local security guardrails, and execution guardrails only.
- Do not store framework-level tactics as permanent harness state.
- Use detect-first language selection: infer likely collaboration language from repo signals, then confirm if needed.
- Ask one interview question at a time and reflect runtime progress into `harness-runtime.json`.

## 지속 계약 필드

These fields must stay synchronized across `PROJECT_HARNESS.md` and `harness-contract.json`:

- `communication_language`
- `project_type`
- `definition_of_done`
- `change_posture`
- `change_guardrails`
- `verification_policy`
- `approval_policy`
- `project_commands`
- `project_constraints`
- `rule_strengths`
- `communication_tone`
- `stack_summary`
- `environment`

## 지속 계약 값

- communication_language: ko
- project_type: monorepo
- definition_of_done: 코드 변경은 기본적으로 `pnpm test`, `pnpm lint`, `pnpm build:all`을 통과해야 하며, 필요 시 `pnpm tsc --noEmit`로 타입 검증을 보강한다.
- change_posture: conservative
- change_guardrails:
  - 인증, 권한, 세션, 미들웨어, SAML/SSO 흐름 변경은 먼저 확인받는다.
  - 공개 API 계약, 외부 연동, 시크릿/암호화 처리 변경은 먼저 확인받는다.
  - 데이터 마이그레이션, Prisma 스키마 파괴적 변경, 운영 배포 영향이 큰 수정은 먼저 확인받는다.
- verification_policy: required
- approval_policy: explicit_for_risky_changes
- project_commands:
  - test: pnpm test
  - lint: pnpm lint
  - build: pnpm build:all
  - dev: pnpm dev:all
  - typecheck: pnpm tsc --noEmit
- project_constraints:
  - Prisma 스키마 변경 뒤에는 `pnpm --filter=@suppo/db generate`와 적절한 마이그레이션 흐름을 반드시 반영한다.
  - Edge 미들웨어와 Edge에서 호출될 수 있는 JWT callback 경로에는 Prisma 직접 조회를 추가하지 않는다.
  - 필수 시크릿(`AUTH_SECRET`, `TICKET_ACCESS_SECRET`, `GIT_TOKEN_ENCRYPTION_KEY`)은 기본값 없이 관리하고 길이 요건을 지킨다.
  - 운영 배포에서는 sqld 외부 노출 금지와 shared uploads 볼륨 규칙을 깨지 않는다.
- rule_strengths:
  - change_guardrails: enforced
  - verification_policy: enforced
  - approval_policy: enforced
  - project_constraints: enforced
  - communication_tone: advisory
- communication_tone: supportive
- stack_summary:
  - pnpm workspace monorepo
  - Next.js 15 App Router
  - React 19
  - TypeScript 5
  - Prisma 6 with PostgreSQL
  - PostgreSQL for local development
  - PostgreSQL for production
  - Vitest for unit tests
  - Playwright for E2E tests
  - Docker Compose and Nginx for deployment
- environment:
  - development: Local development uses pnpm workspace commands with PostgreSQL and dual Next.js apps.
  - runtime: Node.js 22 Alpine container runtime for admin/public apps, migrator jobs, and PostgreSQL.
  - primary_os: macOS for local development; Linux containers for deployment.

## 런타임 상태 필드

`harness-runtime.json` tracks only volatile state such as:

- run_mode:
  - bootstrap
- bootstrap_status:
  - configured
- interview_step:
  - complete
- pending_fields:
  - (none)
- confirmed_fields:
  - communication_language
  - project_type
  - definition_of_done
  - change_posture
  - change_guardrails
  - verification_policy
  - approval_policy
  - project_commands
  - project_constraints
  - rule_strengths
  - communication_tone
  - stack_summary
  - environment
- validated_shared_fields:
  - communication_language
  - project_type
  - definition_of_done
  - change_posture
  - change_guardrails
  - verification_policy
  - approval_policy
  - project_commands
  - project_constraints
  - rule_strengths
  - communication_tone
  - stack_summary
  - environment
- drift_reasons:
  - (none)
- sync_status:
  - healthy
- entry_files_sync:
  - status: healthy
  - entry_files:
    - AGENTS.md
    - CLAUDE.md
    - GEMINI.md
  - required_shared_fields:
    - communication_language
    - project_type
    - definition_of_done
    - change_posture
    - change_guardrails
    - verification_policy
    - approval_policy
    - project_commands
    - project_constraints
    - rule_strengths
    - communication_tone
    - stack_summary
    - environment
  - last_checked_at: 2026-04-20T15:56:00+09:00
  - notes:
    - Bootstrap interview completed and managed entry files are expected to match deterministic projections.
- language_detection:
  - strategy: detect_first_then_confirm
  - repo_signal: ko
  - confidence: high
- last_audit_at:
  - 2026-04-20T15:56:00+09:00
- last_validated_at:
  - 2026-04-20T15:56:00+09:00

## 상태 불변식

- `configured` implies `pending_fields` is empty.
- `configured` implies `interview_step` is `complete`.
- `pending_fields` and `confirmed_fields` must not overlap.
- `validated_shared_fields` may contain only shared contract fields.
- `last_validated_at` requires an explicit `sync_status` of `healthy` or `drifted`.

## 진입 파일 원칙

- Keep entry files short enough to stay obviously non-canonical.
- Entry files point back to the canonical durable contract.
- Entry files may mention runtime-state recovery, but must not duplicate the full policy block.

## 복구 순서

1. `harness-contract.json`
2. `harness-runtime.json`
3. `PROJECT_HARNESS.md`
4. `AGENTS.md`
5. `CLAUDE.md`
6. `GEMINI.md`

Repair durable contract first, then volatile runtime state, then projections.

## 완료 전 체크리스트

- All managed files exist.
- `PROJECT_HARNESS.md` and `harness-contract.json` agree on shared contract fields.
- `harness-runtime.json` invariants hold.
- Entry files are thin and aligned.
- `validated_shared_fields` matches what was actually checked.
- Change history is updated when durable defaults change.

## 변경 이력

| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-04-20 | Initialized local harness bootstrap and confirmed collaboration language. | harness-contract.json, harness-runtime.json | Bootstrap durable harness state for this repository. |
| 2026-04-20 | Confirmed default completion gate, verification policy, and root execution commands. | harness-contract.json | Repository owner confirmed the default done criteria for routine work. |
| 2026-04-20 | Confirmed conservative default change posture. | harness-contract.json | Repository owner prefers small, low-risk changes unless broader work is explicitly requested. |
| 2026-04-20 | Confirmed sensitive-area change guardrails for auth, APIs, secrets, and database-impacting work. | harness-contract.json | Repository owner wants explicit confirmation before high-risk or security-sensitive changes. |
| 2026-04-20 | Confirmed approval policy for risky changes only. | harness-contract.json | Safe small changes may proceed directly, but risky changes require explicit confirmation. |
| 2026-04-20 | Captured repository constraints and inferred stack/environment defaults from strong repo signals. | harness-contract.json | Existing README, Docker assets, and package manifests provide stable canonical project context. |
| 2026-04-20 | Confirmed a more detailed and explanatory collaboration tone. | harness-contract.json | Repository owner prefers detailed guidance over terse responses. |
| 2026-04-30 | Updated durable stack defaults after SQLite/libSQL to PostgreSQL migration. | PROJECT_HARNESS.md, harness-contract.json | Repository database stack now uses PostgreSQL for development and production. |
