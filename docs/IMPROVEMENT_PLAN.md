# Crinity Helpdesk 개선 계획서

## 개요

본 문서는 사용자가 제시한 Git 연동 고도화 및 응답 품질 개선 요구사항에 대한 분석과 구현 계획을 정리합니다.

---

## A) 티켓 ↔ Git 연동 고도화

### 1. CodeCommit URL 검증 불일치 보정

**현재 문제:**
- `validateIssueUrl()` 함수는 GitHub/GitLab URL만 허용
- CodeCommit은 실제로 미구현 상태 (`GitProviderNotSupportedError` 발생)
- DB 스키마에는 CODECOMMIT이 존재하나 실제 API 연동 없음

**개선 방안:**
```typescript
// src/lib/git/provider.ts
export function validateIssueUrl(url: string, provider?: GitProvider): string {
  const trimmed = url.trim();
  
  switch (provider) {
    case 'GITHUB':
      if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+/.test(trimmed)) {
        throw new Error('유효하지 않은 GitHub 이슈 URL입니다.');
      }
      break;
    case 'GITLAB':
      if (!/^https:\/\/[^/]+\/[^/]+\/[^/]+\/-\/issues\/\d+/.test(trimmed)) {
        throw new Error('유효하지 않은 GitLab 이슈 URL입니다.');
      }
      break;
    case 'CODECOMMIT':
      // AWS CodeCommit은 이슈 시스템이 별도로 존재하지 않음
      // PR URL 또는 커밋 URL 형식 검증
      if (!/^https:\/\/[^.]+\.console\.aws\.amazon\.com\/codesuite\/codecommit\/repositories\//.test(trimmed)) {
        throw new Error('유효하지 않은 CodeCommit URL입니다.');
      }
      break;
  }
  
  return trimmed;
}
```

**우선순위:** 높음 (CodeCommit 사용자 경험 개선)
**예상 소요:** 2-3시간
**의존성:** CodeCommit Provider 구현 필요 (별도 작업)

---

### 2. "연결" 이후 동기화 부재 (Webhook → GitEvent → 티켓 상태)

**현재 문제:**
- GitHub webhook은 수신되나 signature 검증 비활성화
- GitEvent는 저장되나 티켓 상태와 연동되지 않음
- GitLab/CodeCommit webhook 미지원

**개선 방안:**

#### Phase 1: Webhook 인프라 개선
```typescript
// src/app/api/webhooks/github/route.ts
// - Signature 검증 활성화 (HMAC)
// - GitLab webhook 엔드포인트 추가

// src/app/api/webhooks/gitlab/route.ts (신규)
// - GitLab webhook 수신 처리
// - Merge Request 이벤트 지원
```

#### Phase 2: GitEvent → 티켓 상태 연동
```typescript
// src/lib/git/sync/issue-sync.ts (신규)
export async function syncIssueStatusFromGitEvent(event: GitEvent) {
  // 1. GitLink 조회
  const gitLink = await prisma.gitLink.findFirst({
    where: {
      provider: event.provider,
      repoFullName: event.repoFullName,
      issueNumber: event.issueNumber,
    },
    include: { ticket: true }
  });
  
  if (!gitLink) return;
  
  // 2. 상태 매핑
  const statusMapping: Record<string, TicketStatus> = {
    'opened': 'IN_PROGRESS',
    'closed': 'RESOLVED',
    'reopened': 'IN_PROGRESS',
  };
  
  const newStatus = statusMapping[event.payload.state];
  if (newStatus && newStatus !== gitLink.ticket.status) {
    // 3. 티켓 상태 업데이트 (선택적)
    await updateTicketStatus(gitLink.ticketId, newStatus, {
      source: 'GIT_SYNC',
      gitEventId: event.id,
    });
  }
}
```

#### Phase 3: 관리자 설정
```typescript
// Admin 설정 페이지에 추가
- Git 동기화 설정
  - [ ] 티켓 상태 자동 업데이트 (Git 이슈 상태 연동)
  - [ ] 코멘트 자동 추가 (Git 이벤트 코멘트화)
  - [ ] 알림 설정 (이슈 닫힘/재오픈 시)
```

**우선순위:** 중간 (Git 연동의 완성도 향상)
**예상 소요:** 1-2일
**의존성:** Webhook 안정화

---

### 3. 링크 해제/재연결/중복방지 UX

**현재 문제:**
- GitLink 생성만 가능, 삭제/수정 API 없음
- 동일 이슈 중복 연결 가능
- 연결 해제 플로우 부재

**개선 방안:**

#### API 확장
```typescript
// src/app/api/git/links/route.ts

// DELETE - 링크 해제
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const linkId = searchParams.get('id');
  
  // 권한 확인 후 삭제
  await prisma.gitLink.delete({ where: { id: linkId } });
  
  // Audit 로그 기록
  await createAuditLog({ action: 'UNLINK', ... });
}

// PUT - 링크 수정 (이슈 번호/URL 변경)
export async function PUT(request: NextRequest) {
  // 재연결 로직
}
```

#### 중복 방지
```typescript
// GitLink 생성 전 중복 체크
const existing = await prisma.gitLink.findFirst({
  where: {
    ticketId,
    provider,
    repoFullName,
    issueNumber,
  }
});

if (existing) {
  return NextResponse.json(
    { error: '이미 동일한 이슈가 연결되어 있습니다.', existing },
    { status: 409 }
  );
}
```

#### UI 개선
```typescript
// 티켓 상세 페이지의 Git Link 섹션
<GitLinkSection
  links={gitLinks}
  onUnlink={handleUnlink}
  onEdit={handleEdit}
  showDuplicateWarning={true}
/>
```

**우선순위:** 높음 (기본 기능)
**예상 소요:** 4-6시간
**의존성:** 없음

---

### 4. Repo 컨텍스트 저장 (RequestType/Team 단위 기본 repo)

**현재 문제:**
- 매번 owner/repo 수동 입력
- 실수 가능성 높음
- 프로젝트별 기본 저장소 개념 없음

**개선 방안:**

#### DB 스키마 확장
```prisma
// schema.prisma
model RequestType {
  // ... existing fields
  defaultRepoProvider GitProvider?
  defaultRepoFullName String?
}

model Team {
  // ... existing fields
  defaultRepoProvider GitProvider?
  defaultRepoFullName String?
}
```

#### UI 개선
```typescript
// 티켓 생성/수정 시 자동 주입
const defaultRepo = ticket.requestType?.defaultRepoFullName || 
                    ticket.assignee?.team?.defaultRepoFullName;

<GitLinkForm
  initialRepo={defaultRepo}
  autoFillFromContext={true}
/>
```

#### 설정 페이지
```typescript
// /admin/settings/request-types 페이지에 추가
- 기본 Git 저장소 설정 (선택사항)
  - Provider: [GitHub/GitLab]
  - Repository: [owner/repo]
```

**우선순위:** 낮음 (편의성 기능)
**예상 소요:** 1일
**의존성:** 없음

---

### 5. 연동 실패 운영성 (재시도 큐, 실패 원인 코드화)

**현재 문제:**
- 실패 시 즉시 에러 노출
- 재시도 메커니즘 없음
- 실패 원인 추적 어려움

**개선 방안:**

#### GitOperationQueue 모델 추가
```prisma
model GitOperationQueue {
  id          String   @id @default(cuid())
  operation   String   // CREATE_ISSUE, LINK_ISSUE, etc.
  provider    GitProvider
  payload     Json     // 요청 데이터
  status      String   // PENDING, PROCESSING, SUCCESS, FAILED
  retryCount  Int      @default(0)
  maxRetries  Int      @default(3)
  errorCode   String?  // TIMEOUT, AUTH_FAILED, RATE_LIMIT, etc.
  errorMessage String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  processedAt DateTime?
}
```

#### 재시도 로직
```typescript
// src/lib/git/queue/processor.ts
export async function processGitQueue() {
  const pending = await prisma.gitOperationQueue.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      retryCount: { lt: prisma.gitOperationQueue.fields.maxRetries }
    },
    orderBy: { createdAt: 'asc' },
    take: 10
  });
  
  for (const op of pending) {
    try {
      await executeGitOperation(op);
      await markSuccess(op.id);
    } catch (error) {
      const errorCode = classifyError(error);
      await markFailed(op.id, errorCode, error.message);
      
      // 알림 (3회 실패 시)
      if (op.retryCount >= 2) {
        await notifyAdmin(`Git operation failed: ${op.operation}`, error);
      }
    }
  }
}

function classifyError(error: any): string {
  if (error.status === 401) return 'AUTH_FAILED';
  if (error.status === 403) return 'PERMISSION_DENIED';
  if (error.status === 404) return 'RESOURCE_NOT_FOUND';
  if (error.status === 422) return 'VALIDATION_FAILED';
  if (error.code === 'ETIMEDOUT') return 'TIMEOUT';
  if (error.code === 'ECONNREFUSED') return 'CONNECTION_FAILED';
  return 'UNKNOWN';
}
```

#### Cron Job
```bash
# 5분마다 재시도 큐 처리
*/5 * * * * curl http://localhost:3000/api/internal/git-queue-process
```

**우선순위:** 중간 (운영 안정성)
**예상 소요:** 1-2일
**의존성:** 없음

---

## B) 응답 품질(템플릿+AI 보조) 고도화

### 1. 템플릿 권한 검증 강화

**현재 문제:**
- `/api/templates/use`에서 templateId 존재만 확인
- 접근 가능 템플릿인지 검증 없음

**개선 방안:**
```typescript
// src/app/api/templates/use/route.ts
export async function POST(request: NextRequest) {
  // ... existing auth check
  
  const template = await prisma.responseTemplate.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      title: true,
      isShared: true,
      createdById: true,
    },
  });
  
  if (!template) {
    return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 404 });
  }
  
  // 권한 검증 추가
  const canUse = template.isShared || template.createdById === session.user.id;
  if (!canUse) {
    return NextResponse.json(
      { error: "이 템플릿을 사용할 권한이 없습니다." },
      { status: 403 }
    );
  }
  
  // ... rest of the code
}
```

**우선순위:** 높음 (보안)
**예상 소요:** 30분
**의존성:** 없음

---

### 2. 변수 안전성/품질 게이트

**현재 문제:**
- 템플릿에 {{var}}가 실제 데이터와 안 맞아도 전송 가능
- 미리보기 없이 바로 적용

**개선 방안:**

#### API 개선
```typescript
// src/app/api/templates/validate/route.ts (신규)
export async function POST(request: NextRequest) {
  const { templateId, context } = await request.json();
  
  const template = await prisma.responseTemplate.findUnique({
    where: { id: templateId },
    select: { content: true, variables: true }
  });
  
  // 1. 변수 추출
  const usedVars = extractTemplateVariables(template.content);
  
  // 2. 미해결 변수 체크
  const unresolved = usedVars.filter(v => {
    const value = getFieldValue(context, v);
    return value === undefined || value === null || value === '';
  });
  
  // 3. 렌더링 결과 생성
  const rendered = renderTemplate(template.content, context);
  
  return NextResponse.json({
    isValid: unresolved.length === 0,
    unresolvedVariables: unresolved,
    renderedPreview: rendered,
    warnings: unresolved.map(v => `${v} 변수가 누락되었습니다.`)
  });
}
```

#### UI 개선
```typescript
// 템플릿 선택 후 적용 전 다이얼로그
<TemplatePreviewDialog
  template={selectedTemplate}
  ticketContext={ticket}
  onConfirm={applyTemplate}
  showWarnings={true}
  allowForceApply={true} // 경고 무시하고 강제 적용
/>
```

**우선순위:** 중간 (품질 향상)
**예상 소요:** 4-6시간
**의존성:** 없음

---

### 3. 추천 로직 다변화

**현재 문제:**
- 현재 requestType + isRecommended + 최근사용 중심
- 상태/우선순위/고객유형 반영 없음

**개선 방안:**

#### 스코어링 알고리즘
```typescript
// src/app/api/templates/recommended/route.ts
export async function GET(request: NextRequest) {
  const { requestTypeId, ticketId } = request.query;
  
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { customer: true }
  });
  
  const templates = await prisma.responseTemplate.findMany({
    where: { isShared: true }
  });
  
  // 점수 기반 정렬
  const scoredTemplates = templates.map(t => ({
    ...t,
    score: calculateTemplateScore(t, ticket)
  })).sort((a, b) => b.score - a.score);
  
  return NextResponse.json({ templates: scoredTemplates.slice(0, 10) });
}

function calculateTemplateScore(template: ResponseTemplate, ticket: Ticket): number {
  let score = 0;
  
  // 1. 문의 유형 매칭 (+30)
  if (template.requestTypeId === ticket.requestTypeId) score += 30;
  
  // 2. 추천 설정 (+20)
  if (template.isRecommended) score += 20;
  
  // 3. 상태 기반 (+15)
  const statusMatch = {
    'OPEN': ['신규', '접수'],
    'IN_PROGRESS': ['처리중', '진행'],
    'WAITING': ['대기', '보류']
  };
  if (template.title.includes(statusMatch[ticket.status])) score += 15;
  
  // 4. 우선순위 기반 (+10)
  if (ticket.priority === 'HIGH' && template.title.includes('긴급')) score += 10;
  
  // 5. 재오픈 여부 (+10)
  if (ticket.reopenCount > 0 && template.title.includes('재오픈')) score += 10;
  
  // 6. 카테고리 매칭 (+10)
  if (template.categoryId === ticket.categoryId) score += 10;
  
  // 7. 최근 사용 (+5)
  const recentlyUsed = await wasRecentlyUsed(template.id, ticket.assigneeId);
  if (recentlyUsed) score += 5;
  
  return score;
}
```

**우선순위:** 중간 (UX 향상)
**예상 소요:** 1일
**의존성:** 없음

---

### 4. 최근 사용 정렬 정확도

**현재 문제:**
- 최근 사용 ID 조회 후 템플릿 재조회 시 순서 보장 안됨
- `findMany({ where: { id: { in: [...] } } })`는 순서 보장 안됨

**개선 방안:**
```typescript
// src/app/api/templates/recommended/route.ts
const recentlyUsedIds = ['id3', 'id1', 'id2']; // 최신순

const recentTemplates = recentlyUsedIds.length > 0
  ? await prisma.responseTemplate.findMany({
      where: {
        id: { in: recentlyUsedIds },
        OR: [
          { isShared: true },
          { createdById: session.user.id }
        ]
      }
    })
  : [];

// 순서 재정렬 (recentlyUsedIds 순서대로)
const orderedRecentTemplates = recentlyUsedIds
  .map(id => recentTemplates.find(t => t.id === id))
  .filter((t): t is ResponseTemplate => t !== undefined);
```

**우선순위:** 낮음 (세부 개선)
**예상 소요:** 30분
**의존성:** 없음

---

### 5. 템플릿 효과 측정

**현재 문제:**
- 사용 기록은 있으나 성과 지표 없음
- 어떤 템플릿이 효과적인지 알 수 없음

**개선 방안:**

#### DB 스키마 확장
```prisma
model ResponseTemplate {
  // ... existing fields
  useCount        Int      @default(0)
  avgResponseTime Int?     // 평균 응답 시간 (분)
  resolutionRate  Float?   // 1회 해결률
  reopenRate      Float?   // 재오픈률
}

model TemplateUsageStats {
  id              String   @id @default(cuid())
  templateId      String
  ticketId        String
  agentId         String
  usedAt          DateTime @default(now())
  responseTime    Int      // 템플릿 사용 후 응답까지 시간 (분)
  wasResolved     Boolean  // 1회 해결 여부
  wasReopened     Boolean  // 재오픈 여부
  customerRating  Int?     // 고객 만족도 (있는 경우)
}
```

#### 분석 로직
```typescript
// src/lib/templates/analytics.ts
export async function calculateTemplateEffectiveness(templateId: string) {
  const usages = await prisma.templateUsageStats.findMany({
    where: { templateId }
  });
  
  const total = usages.length;
  if (total === 0) return null;
  
  return {
    useCount: total,
    avgResponseTime: usages.reduce((a, b) => a + b.responseTime, 0) / total,
    resolutionRate: usages.filter(u => u.wasResolved).length / total,
    reopenRate: usages.filter(u => u.wasReopened).length / total,
    avgCustomerRating: usages.reduce((a, b) => a + (b.customerRating || 0), 0) / 
                       usages.filter(u => u.customerRating).length
  };
}
```

#### 대시보드
```typescript
// /admin/templates 페이지에 통계 탭 추가
<TemplateStatsDashboard
  metrics={['useCount', 'resolutionRate', 'avgResponseTime']}
  sortBy="effectiveness"
/>
```

**우선순위:** 낮음 (데이터 기반 개선)
**예상 소요:** 1-2일
**의존성:** 없음

---

### 6. UX 버그: "낶부 메모" 오타 수정

**위치:**
- `/src/components/admin/comment-section.tsx` 라인 198, 203

**수정:**
```typescript
// 변경 전
aria-label="낶부 메모로 저장"
<label>낶부 메모로 저장</label>

// 변경 후
aria-label="낶부 메모로 저장"
<label>낶부 메모로 저장</label>
```

**우선순위:** 높음 (신뢰도)
**예상 소요:** 5분
**의존성:** 없음

---

## 종합 우선순위 및 로드맵

### Phase 1: 핫픽스 (즉시)
- [ ] B-1: 템플릿 권한 검증 강화 (30분)
- [ ] B-6: "낶부 메모" 오타 수정 (5분)
- [ ] B-4: 최근 사용 정렬 정확도 (30분)

### Phase 2: 핵심 기능 (1주)
- [ ] A-3: 링크 해제/재연결/중복방지 UX (4-6시간)
- [ ] A-1: CodeCommit URL 검증 보정 (2-3시간)
- [ ] B-2: 변수 안전성/품질 게이트 (4-6시간)

### Phase 3: 고도화 (2-3주)
- [ ] A-2: Webhook 동기화 (1-2일)
- [ ] A-5: 연동 실패 운영성 (1-2일)
- [ ] B-3: 추천 로직 다변화 (1일)
- [ ] B-5: 템플릿 효과 측정 (1-2일)

### Phase 4: 편의성 (선택)
- [ ] A-4: Repo 컨텍스트 저장 (1일)

---

## 결론

현재 Crinity Helpdesk의 Git 연동과 템플릿 시스템은 기본적인 기능은 구현되어 있으나, 운영성과 UX 측면에서 개선의 여지가 있습니다.

**즉시 적용 권장:**
1. 템플릿 권한 검증 (보안)
2. 오타 수정 (신뢰도)
3. 링크 해제 기능 (기본 기능)

**단기 적용 권장:**
1. 변수 검증/미리보기 (품질)
2. Webhook 동기화 (완성도)
3. 추천 로직 개선 (UX)

본 계획서를 바탕으로 우선순위에 따라 구현을 진행하시면 됩니다.
