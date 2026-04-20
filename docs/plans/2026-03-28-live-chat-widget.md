# Live Chat Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 실시간 고객 채팅을 티켓 시스템과 통합하고, 관리자 배정/양도/첨부파일/임베드 SDK까지 포함한 확장 가능한 채팅 플랫폼을 구축한다.

**Architecture:** 채팅은 기존 `Ticket`/`Comment`/`Attachment`를 재사용하고, 별도의 `ChatConversation`/`ChatEvent`/`ChatWidgetSettings` 모델로 실시간 세션과 임베드 구성을 분리한다. 실시간 전송은 Next.js Route Handler 기반 SSE로 제공하고, 써드파티 사이트 임베드는 `sdk.js + iframe widget` 패턴으로 구현한다.

**Tech Stack:** Next.js App Router, Prisma, React 19, SSE, Playwright, Vitest, shadcn/ui

---

### Task 1: Chat Data Model

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `tests/unit/chat/chat-model-contract.spec.ts`

**Step 1: Write the failing test**
- 채팅 세션, 이벤트, 위젯 설정 모델이 필요하다는 계약 테스트를 추가한다.

**Step 2: Run test to verify it fails**
- Run: `pnpm vitest run tests/unit/chat/chat-model-contract.spec.ts`

**Step 3: Write minimal implementation**
- `ChatConversation`, `ChatEvent`, `ChatWidgetSettings` 모델과 enum을 추가한다.
- `Ticket.source = IN_APP`와 연결되는 세션 구조를 만든다.

**Step 4: Run test to verify it passes**
- Run: `pnpm vitest run tests/unit/chat/chat-model-contract.spec.ts`

**Step 5: Migrate and generate**
- Run: `DATABASE_URL='file:/.../packages/db/dev.db' pnpm --filter=@suppo/db exec prisma migrate dev --name add_live_chat`

### Task 2: Conversation Service

**Files:**
- Create: `apps/admin/src/lib/chat/service.ts`
- Create: `tests/unit/chat/chat-service.spec.ts`

**Step 1: Write the failing test**
- 새 채팅 시작 시 티켓/세션/첫 메시지가 생성되고 자동 배정되는 테스트를 작성한다.
- 상담원 메시지와 고객 메시지 생성 시 `ChatEvent`가 남는지 테스트한다.

**Step 2: Run test to verify it fails**
- Run: `pnpm vitest run tests/unit/chat/chat-service.spec.ts`

**Step 3: Write minimal implementation**
- `startChatConversation`, `postChatMessage`, `getConversationByCustomerToken`, `getAdminChatQueue`를 구현한다.

**Step 4: Run test to verify it passes**
- Run: `pnpm vitest run tests/unit/chat/chat-service.spec.ts`

### Task 3: Real-Time SSE

**Files:**
- Create: `apps/public/src/app/api/chat/conversations/[id]/stream/route.ts`
- Create: `apps/admin/src/app/api/admin/chat/stream/route.ts`
- Create: `tests/unit/chat/chat-stream-route.spec.ts`

**Step 1: Write the failing test**
- SSE 라우트가 최신 이벤트를 텍스트 스트림으로 흘려보내는 테스트를 작성한다.

**Step 2: Run test to verify it fails**
- Run: `pnpm vitest run tests/unit/chat/chat-stream-route.spec.ts`

**Step 3: Write minimal implementation**
- DB polling 기반 SSE 스트림을 구현한다.

**Step 4: Run test to verify it passes**
- Run: `pnpm vitest run tests/unit/chat/chat-stream-route.spec.ts`

### Task 4: Public Widget UI

**Files:**
- Create: `apps/public/src/app/(public)/chat/widget/page.tsx`
- Create: `apps/public/src/components/chat/chat-widget-shell.tsx`
- Create: `apps/public/src/components/chat/chat-thread.tsx`
- Create: `apps/public/src/components/chat/chat-composer.tsx`
- Create: `tests/e2e/specs/14-live-chat-widget.spec.ts`

**Step 1: Write the failing E2E**
- 고객이 위젯에서 대화를 시작하고 답변을 실시간으로 보는 시나리오를 작성한다.

**Step 2: Run test to verify it fails**
- Run: `pnpm playwright test tests/e2e/specs/14-live-chat-widget.spec.ts --reporter=list`

**Step 3: Write minimal implementation**
- 이름/이메일/첫 메시지 입력, 첨부파일, 토큰 저장, SSE 구독 UI를 구현한다.

**Step 4: Run test to verify it passes**
- Run: `pnpm playwright test tests/e2e/specs/14-live-chat-widget.spec.ts --reporter=list`

### Task 5: Admin Chat Workspace

**Files:**
- Create: `apps/admin/src/app/(admin)/admin/chats/page.tsx`
- Create: `apps/admin/src/app/(admin)/admin/chats/[id]/page.tsx`
- Create: `apps/admin/src/components/admin/chat-queue.tsx`
- Create: `apps/admin/src/components/admin/chat-workspace.tsx`
- Modify: `apps/admin/src/lib/navigation/admin-nav.ts`
- Create: `tests/e2e/specs/15-admin-chat-workspace.spec.ts`

**Step 1: Write the failing E2E**
- 상담원이 새 채팅을 보고 배정 상태를 확인하고 응답/양도하는 흐름을 테스트한다.

**Step 2: Run test to verify it fails**
- Run: `pnpm playwright test tests/e2e/specs/15-admin-chat-workspace.spec.ts --reporter=list`

**Step 3: Write minimal implementation**
- 채팅 큐, 세션 상세, 양도/상태 변경, 실시간 새 메시지 표시를 구현한다.

**Step 4: Run test to verify it passes**
- Run: `pnpm playwright test tests/e2e/specs/15-admin-chat-workspace.spec.ts --reporter=list`

### Task 6: Embeddable SDK

**Files:**
- Create: `apps/public/src/app/chat/sdk/route.ts`
- Create: `apps/public/src/app/(public)/chat/embed/page.tsx`
- Create: `tests/e2e/specs/16-chat-sdk-embed.spec.ts`

**Step 1: Write the failing E2E**
- 외부 페이지에서 SDK를 불러오면 플로팅 버튼이 나타나고 iframe 위젯이 열리는지 테스트한다.

**Step 2: Run test to verify it fails**
- Run: `pnpm playwright test tests/e2e/specs/16-chat-sdk-embed.spec.ts --reporter=list`

**Step 3: Write minimal implementation**
- SDK script, iframe modal, 공개 설정 로딩, 플로팅 버튼 테마를 구현한다.

**Step 4: Run test to verify it passes**
- Run: `pnpm playwright test tests/e2e/specs/16-chat-sdk-embed.spec.ts --reporter=list`

### Task 7: Final Verification

**Files:**
- Modify as needed based on test results

**Step 1: Run focused unit tests**
- Run: `pnpm vitest run tests/unit/chat/*.spec.ts`

**Step 2: Run focused E2E tests**
- Run:
```bash
pnpm playwright test tests/e2e/specs/14-live-chat-widget.spec.ts --reporter=list
pnpm playwright test tests/e2e/specs/15-admin-chat-workspace.spec.ts --reporter=list
pnpm playwright test tests/e2e/specs/16-chat-sdk-embed.spec.ts --reporter=list
```

**Step 3: Run build**
- Run: `pnpm build:all`

**Step 4: Fix remaining issues and re-run**
- 안정화 후 전체 결과를 정리한다.
