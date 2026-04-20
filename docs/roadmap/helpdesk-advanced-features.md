# Suppo 고도화 전략 보고서
## Zendesk / Freshdesk / Jira Service Management 오마주 로드맵

---

## 1. 현재 시스템 분석 (AS-IS)

### 1.1 구현된 기능

#### ✅ 티켓 라이프사이클 기본
- **Status Enum**: OPEN → IN_PROGRESS → WAITING → RESOLVED → CLOSED
- **Activity Logging**: TicketActivity 모델로 모든 상태 변경 기록
- **Transfer System**: TicketTransfer 모델로 양도 이력 관리
- **Auto-Assignment**: 카테고리 전문성 + 로드밸런싱 알고리즘 구현

#### ✅ SLA 관리 기반
- **SLAPolicy 모델**: 우선순위별 응답/해결 시간 정의
- **SLAClock 모델**: 티켓별 SLA 추적 (RUNNING/PAUSED/STOPPED)
- **BusinessCalendar**: 업무 시간/휴일 관리
- **SLA Engine**: `/src/lib/sla/engine.ts` 기본 구현

#### ✅ 템플릿 시스템
- **ResponseTemplate**: 카테고리별 응답 템플릿 저장
- **AI Integration**: Ollama/Gemini 연동, 고객 분석 기능

#### ✅ 기타 기능
- **Audit Logging**: 모든 관리자/상담원 행동 기록
- **Email Threading**: EmailThreadMapping 모델로 메일 스레딩
- **Git Integration**: GitHub/GitLab 이슈 연동
- **Multi-tenant Branding**: 도메인별 브랜딩

---

### 1.2 미구현 기능 (Gap Analysis)

#### ❌ 고급 워크플로우 엔진
- 상태 전이(Transition)별 조걶 및 액션 트리거
- 워크플로우 시각화 및 커스터마이징

#### ❌ 자동화/매크로 시스템
- 조걶 기반 자동화 (Triggers)
- 시나리오 자동화 (Dispatch'r 유사)
- 매크로 실행 로깅

#### ❌ SLA 고급 기능
- 에스컬레이션 룰
- SLA 위반 시 자동 액션
- 업무 시간 기준 정밀 계산

#### ❌ Omni-channel 통합
- 다양한 채널(채팅, 전화) 통합
- 채널별 라우팅 규칙

---

## 2. 오마주 구현 방안 (TO-BE)

### 2.1 고급 워크플로우 엔진 (Jira-style)

#### 핵심 로직 요약
Jira의 워크플로우는 "상태(State) + 전이(Transition) + 조건/검증/후처리(Condition/Validator/Post-function)"로 구성됩니다. 각 전이는 특정 조건을 만족해야 실행되며, 성공 시 후처리 액션을 실행합니다.

#### 오마주 구현 방안

**Phase 1: Workflow 데이터 모델 설계**

```prisma
// Workflow Definition
model Workflow {
  id          String              @id @default(cuid())
  name        String
  description String?
  isDefault   Boolean             @default(false)
  isActive    Boolean             @default(true)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  
  states      WorkflowState[]
  transitions WorkflowTransition[]
  tickets     Ticket[]
}

model WorkflowState {
  id          String   @id @default(cuid())
  workflowId  String
  name        String   // 예: "OPEN", "IN_PROGRESS"
  label       String   // 표시명: "접수됨", "처리 중"
  color       String   // UI 표시 색상
  isInitial   Boolean  @default(false)  // 시작 상태
  isResolved  Boolean  @default(false)  // 해결 상태
  isClosed    Boolean  @default(false)  // 종료 상태
  order       Int      @default(0)
  
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  fromTransitions WorkflowTransition[] @relation("FromState")
  toTransitions   WorkflowTransition[] @relation("ToState")
  
  @@index([workflowId])
}

model WorkflowTransition {
  id          String   @id @default(cuid())
  workflowId  String
  name        String   // "Start Progress", "Resolve"
  fromStateId String
  toStateId   String
  
  // 조건 및 액션 (JSON으로 저장)
  conditions  Json?    // 실행 조건
  validators  Json?    // 검증 규칙
  postActions Json?    // 후처리 액션
  
  workflow    Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  fromState   WorkflowState @relation("FromState", fields: [fromStateId], references: [id])
  toState     WorkflowState @relation("ToState", fields: [toStateId], references: [id])
  
  @@index([workflowId])
  @@index([fromStateId])
  @@index([toStateId])
}
```

**Phase 2: Workflow Engine 구현**

```typescript
// src/lib/workflow/engine.ts

interface TransitionCondition {
  type: 'field_equals' | 'field_contains' | 'sla_breach' | 'time_elapsed';
  field?: string;
  value?: any;
  hours?: number;
}

interface TransitionAction {
  type: 'assign_agent' | 'send_email' | 'webhook' | 'update_field' | 'add_tag';
  config: Record<string, any>;
}

export class WorkflowEngine {
  async executeTransition(
    ticketId: string,
    transitionId: string,
    actorId: string
  ): Promise<boolean> {
    const transition = await prisma.workflowTransition.findUnique({
      include: { fromState: true, toState: true }
    });
    
    // 1. 현재 상태 검증
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (ticket?.status !== transition.fromState.name) {
      throw new Error('Invalid state transition');
    }
    
    // 2. 조건 검증
    if (transition.conditions) {
      const canExecute = await this.evaluateConditions(
        ticket, 
        transition.conditions as TransitionCondition[]
      );
      if (!canExecute) throw new Error('Transition conditions not met');
    }
    
    // 3. 상태 변경
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: transition.toState.name }
    });
    
    // 4. 후처리 액션 실행
    if (transition.postActions) {
      await this.executeActions(
        ticketId,
        transition.postActions as TransitionAction[]
      );
    }
    
    return true;
  }
}
```

**Phase 3: Workflow 관리 UI**

```typescript
// 관리자 페이지: /admin/settings/workflows
// - 드래그앤드롭으로 상태/전이 시각화
// - 조건/액션 설정 UI
// - 워크플로우 미리보기/시뮬레이션
```

**AI Synergy 포인트**
- AI가 추천하는 최적의 다음 상태 제시
- 유사 티켓의 전이 패턴 분석하여 워크플로우 최적화 제안

---

### 2.2 자동화/매크로 시스템 (Zendesk/Freshdesk-style)

#### 핵심 로직 요약
Zendesk의 "Triggers & Automations"과 Freshdesk의 "Scenario Automation"은 "조건(When) + 액션(Then)" 패턴을 따릅니다. Triggers는 이벤트 기반(실시간), Automations는 시간 기반(주기적 실행)입니다.

#### 오마주 구현 방안

**Phase 1: Automation Rule 데이터 모델**

```prisma
// 자동화 규칙
model AutomationRule {
  id          String              @id @default(cuid())
  name        String
  description String?
  
  // 실행 타입
  type        AutomationType      // TRIGGER | AUTOMATION
  
  // 실행 조건
  conditions  Json                // 다중 조건 지원
  
  // 실행 액션
  actions     Json                // 다중 액션 지원
  
  // 설정
  isActive    Boolean             @default(true)
  order       Int                 @default(0)  // 실행 순서
  
  // 메타데이터
  lastRunAt   DateTime?
  runCount    Int                 @default(0)
  
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  
  logs        AutomationLog[]
  
  @@index([type, isActive])
  @@index([order])
}

// 자동화 실행 로그
model AutomationLog {
  id          String   @id @default(cuid())
  ruleId      String
  ticketId    String?
  status      String   // SUCCESS | FAILED | SKIPPED
  inputData   Json?    // 실행 시 입력 데이터
  outputData  Json?    // 실행 결과
  error       String?
  executedAt  DateTime @default(now())
  
  rule AutomationRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  
  @@index([ruleId])
  @@index([executedAt])
}

enum AutomationType {
  TRIGGER     // 이벤트 기반 (실시간)
  AUTOMATION  // 시간 기반 (주기적)
}
```

**Phase 2: 조건 및 액션 정의**

```typescript
// src/lib/automation/types.ts

// 조건 타입
export interface AutomationCondition {
  id: string;
  type: 'ticket_field' | 'agent_field' | 'time_based' | 'sla_status';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  field?: string;
  value: any;
}

// 액션 타입
export interface AutomationAction {
  id: string;
  type: 
    | 'update_ticket' 
    | 'add_comment' 
    | 'assign_agent'
    | 'assign_team'
    | 'change_priority'
    | 'change_status'
    | 'add_tag'
    | 'remove_tag'
    | 'send_email'
    | 'webhook'
    | 'escalate'
    | 'apply_macro';
  config: Record<string, any>;
}

// 자동화 규칙 예시
export const exampleRules = {
  // Zendesk-style Trigger: 긴급 티켓 자동 할당
  urgentAutoAssign: {
    type: 'TRIGGER',
    conditions: [
      { type: 'ticket_field', field: 'priority', operator: 'equals', value: 'URGENT' },
      { type: 'ticket_field', field: 'status', operator: 'equals', value: 'OPEN' }
    ],
    actions: [
      { type: 'assign_team', config: { teamId: 'urgent-response-team' } },
      { type: 'add_tag', config: { tag: 'auto-assigned-urgent' } },
      { type: 'send_email', config: { template: 'urgent-notification' } }
    ]
  },
  
  // Freshdesk-style Scenario: 고객 등급별 라우팅
  vipCustomerRouting: {
    type: 'TRIGGER',
    conditions: [
      { type: 'ticket_field', field: 'customer.tags', operator: 'contains', value: 'VIP' },
    ],
    actions: [
      { type: 'change_priority', config: { priority: 'HIGH' } },
      { type: 'assign_agent', config: { agentId: 'vip-specialist' } },
      { type: 'add_tag', config: { tag: 'vip-customer' } }
    ]
  },
  
  // 시간 기반 자동화: 미응답 티켓 에스컬레이션
  unrespondedEscalation: {
    type: 'AUTOMATION',
    conditions: [
      { type: 'ticket_field', field: 'status', operator: 'equals', value: 'OPEN' },
      { type: 'time_based', field: 'hours_since_created', operator: 'greater_than', value: 4 }
    ],
    actions: [
      { type: 'escalate', config: { level: 'supervisor' } },
      { type: 'add_comment', config: { content: '자동 에스컬레이션: 4시간 미응답', internal: true } }
    ]
  }
};
```

**Phase 3: 자동화 엔진 구현**

```typescript
// src/lib/automation/engine.ts

export class AutomationEngine {
  // 이벤트 기반 실행 (Triggers)
  async processEvent(
    eventType: string,
    ticketId: string,
    eventData: any
  ): Promise<void> {
    const rules = await prisma.automationRule.findMany({
      where: { type: 'TRIGGER', isActive: true },
      orderBy: { order: 'asc' }
    });
    
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { customer: true, assignee: true, comments: true }
    });
    
    for (const rule of rules) {
      try {
        const shouldExecute = await this.evaluateConditions(
          rule.conditions as AutomationCondition[],
          ticket,
          eventData
        );
        
        if (shouldExecute) {
          await this.executeActions(
            rule.actions as AutomationAction[],
            ticketId,
            eventData
          );
          
          await this.logExecution(rule.id, ticketId, 'SUCCESS');
        }
      } catch (error) {
        await this.logExecution(rule.id, ticketId, 'FAILED', error);
      }
    }
  }
  
  // 시간 기반 실행 (Automations) - 크론 작업에서 호출
  async processAutomations(): Promise<void> {
    const rules = await prisma.automationRule.findMany({
      where: { type: 'AUTOMATION', isActive: true }
    });
    
    for (const rule of rules) {
      // 조건에 맞는 티켓 검색
      const tickets = await this.findMatchingTickets(
        rule.conditions as AutomationCondition[]
      );
      
      for (const ticket of tickets) {
        await this.executeActions(
          rule.actions as AutomationAction[],
          ticket.id
        );
      }
      
      await prisma.automationRule.update({
        where: { id: rule.id },
        data: { lastRunAt: new Date() }
      });
    }
  }
}
```

**AI Synergy 포인트**
- AI가 티켓 내용 분석하여 자동으로 태그/우선순위/카테고리 추천
- 유사 티켓의 처리 패턴 학습하여 자동화 규칙 추천
- 자동화 실패 시 AI가 원인 분석 및 대안 제시

---

### 2.3 SLA 고급 기능 (SLA Breach & Escalation)

#### 핵심 로직 요약
SLA는 단순히 시간을 재는 것이 아니라, 업무 시간을 고려한 계산, 일시정지/재개, 위반 시 에스컬레이션 체인이 필요합니다.

#### 오마주 구현 방안

**Phase 1: SLA 엔진 고도화**

```typescript
// src/lib/sla/advanced-engine.ts

export interface SLAConfig {
  businessHours: {
    start: number;  // 9 (9시)
    end: number;    // 18 (18시)
    workDays: number[];  // [1, 2, 3, 4, 5] 월-금
    timezone: string;
  };
  holidays: Date[];
  escalationChain: EscalationStep[];
}

export interface EscalationStep {
  level: number;
  triggerAt: number;  // SLA 위반 N분 전
  action: 'notify' | 'reassign' | 'escalate' | 'alert_manager';
  targetId?: string;  // 담당자/팀 ID
}

export class AdvancedSLAEngine {
  // 업무 시간 기준 마감일 계산
  calculateDeadline(
    startTime: Date,
    hours: number,
    config: SLAConfig
  ): Date {
    let remainingHours = hours;
    let currentTime = new Date(startTime);
    
    while (remainingHours > 0) {
      const workDayEnd = this.getWorkDayEnd(currentTime, config);
      const hoursUntilEnd = (workDayEnd.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilEnd >= remainingHours) {
        // 당일 내 완료 가능
        currentTime = new Date(currentTime.getTime() + remainingHours * 60 * 60 * 1000);
        remainingHours = 0;
      } else {
        // 다음 영업일로 넘김
        remainingHours -= hoursUntilEnd;
        currentTime = this.getNextWorkDayStart(currentTime, config);
      }
    }
    
    return currentTime;
  }
  
  // SLA 위반 감지 및 에스컬레이션
  async checkBreaches(): Promise<void> {
    const activeClocks = await prisma.sLAClock.findMany({
      where: {
        status: 'RUNNING',
        deadlineAt: { lte: new Date() }
      },
      include: { ticket: true, policy: true }
    });
    
    for (const clock of activeClocks) {
      // 위반 처리
      await prisma.sLAClock.update({
        where: { id: clock.id },
        data: { 
          status: 'STOPPED',
          breachedAt: new Date()
        }
      });
      
      // 에스컬레이션 실행
      await this.executeEscalation(clock);
    }
  }
  
  // 에스컬레이션 체인 실행
  private async executeEscalation(clock: any): Promise<void> {
    const config = await this.getSLAConfig(clock.policy);
    
    for (const step of config.escalationChain) {
      switch (step.action) {
        case 'notify':
          await this.notifyAgent(clock.ticket.assigneeId, clock);
          break;
        case 'reassign':
          await this.reassignToTeam(clock.ticket.id, step.targetId);
          break;
        case 'escalate':
          await this.escalateToManager(clock.ticket.id, step.targetId);
          break;
        case 'alert_manager':
          await this.sendManagerAlert(clock);
          break;
      }
    }
  }
}
```

**Phase 2: 실시간 SLA 모니터링**

```typescript
// 실시간 SLA 대시보드용 API
// GET /api/admin/sla/dashboard
{
  "atRisk": [  // 위험 티켓 (30분 이내 위반 예상)
    {
      "ticketId": "...",
      "ticketNumber": "TKT-001",
      "remainingMinutes": 15,
      "target": "FIRST_RESPONSE"
    }
  ],
  "breached": [  // 위반된 티켓
    {
      "ticketId": "...",
      "breachedAt": "2024-03-15T10:00:00Z",
      "breachDuration": 120  // 분
    }
  ],
  "metrics": {
    "firstResponseCompliance": 95.5,  // %
    "resolutionCompliance": 88.2
  }
}
```

**AI Synergy 포인트**
- AI가 SLA 위반 예측 (티켓 내용 복잡도 분석)
- 자동 담당자 추천으로 재할당 최적화
- SLA 위반 패턴 분석하여 정책 개선 제안

---

### 2.4 Omni-channel 통합 기반

#### 핵심 로직 요약
Zendesk의 Unified Interface는 모든 채널의 대화를 하나의 티켓 ID로 통합합니다. Message-ID, Thread-ID 등을 파싱하여 동일 대화를 연결합니다.

#### 오마주 구현 방안

**Phase 1: 채널 추상화 레이어**

```prisma
// 채널 정의
model Channel {
  id          String        @id @default(cuid())
  name        String        // "email", "chat", "phone"
  type        ChannelType
  config      Json          // 채널별 설정
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
}

enum ChannelType {
  EMAIL
  CHAT
  PHONE
  API
}

// 대화 스레드 (채널 독립적)
model Conversation {
  id          String   @id @default(cuid())
  ticketId    String
  channelId   String
  externalId  String?  // 외부 채널 ID (Message-ID 등)
  
  messages    Message[]
  
  ticket      Ticket   @relation(fields: [ticketId], references: [id])
  
  @@index([ticketId])
  @@index([externalId])
}

model Message {
  id              String   @id @default(cuid())
  conversationId  String
  authorType      AuthorType
  authorId        String?
  content         String
  attachments     Attachment[]
  metadata        Json?    // 채널별 메타데이터
  createdAt       DateTime @default(now())
  
  conversation    Conversation @relation(fields: [conversationId], references: [id])
}
```

**Phase 2: Email Threading 고도화**

```typescript
// src/lib/email/threading.ts

export class EmailThreadingService {
  // 이메일 헤더에서 스레드 ID 추출
  extractThreadId(headers: EmailHeaders): string | null {
    // In-Reply-To 헤더
    if (headers['in-reply-to']) {
      return this.extractMessageId(headers['in-reply-to']);
    }
    
    // References 헤더 (스레드 체인)
    if (headers['references']) {
      const refs = headers['references'].split(' ');
      return this.extractMessageId(refs[0]);  // 첫 번째 참조가 원본
    }
    
    // Subject 기반 추출 (Re:, Fwd: 제거)
    const cleanSubject = headers.subject?.replace(/^(Re:|Fwd:)\s*/i, '');
    return cleanSubject ? `subject:${cleanSubject}` : null;
  }
  
  // 기존 티켓에 스레딩 또는 새 티켓 생성
  async processIncomingEmail(email: IncomingEmail): Promise<Ticket> {
    const threadId = this.extractThreadId(email.headers);
    
    if (threadId) {
      // 기존 스레드 검색
      const existingThread = await prisma.emailThreadMapping.findFirst({
        where: { threadId },
        include: { ticket: true }
      });
      
      if (existingThread) {
        // 기존 티켓에 댓글 추가
        await this.addCommentToTicket(existingThread.ticketId, email);
        return existingThread.ticket;
      }
    }
    
    // 새 티켓 생성
    return this.createTicketFromEmail(email, threadId);
  }
}
```

---

## 3. 통합 구현 로드맵

### Phase 1: 기반 다지기 (1-2주)
- [ ] Workflow 데이터 모델 설계 및 마이그레이션
- [ ] Automation Rule 데이터 모델 설계 및 마이그레이션
- [ ] SLA 엔진 고도화 (업무 시간 계산)

### Phase 2: 워크플로우 엔진 (2-3주)
- [ ] Workflow Engine 구현
- [ ] 상태 전이 API 개발
- [ ] Workflow 관리자 UI 개발

### Phase 3: 자동화 시스템 (2-3주)
- [ ] Automation Engine 구현
- [ ] 조건/액션 DSL 설계
- [ ] 자동화 규칙 관리 UI
- [ ] 크론 작업 설정 (Automations)

### Phase 4: SLA 고도화 (1-2주)
- [ ] 에스컬레이션 체인 구현
- [ ] SLA 위반 처리 로직
- [ ] 실시간 SLA 모니터링 API

### Phase 5: 통합 및 테스트 (1주)
- [ ] AI 연동 포인트 구현
- [ ] 통합 테스트
- [ ] 성능 최적화

---

## 4. 엣지 케이스 및 해결책

### 4.1 Workflow 엔진
| 엣지 케이스 | 해결책 |
|------------|--------|
| 순환 전이 방지 | 그래프 탐색으로 순환 감지 |
| 다중 전이 충돌 | 우선순위 점수로 결정 |
| 비동기 액션 실패 | Dead Letter Queue + 재시도 |

### 4.2 Automation
| 엣지 케이스 | 해결책 |
|------------|--------|
| 규칙 무한 루프 | 실행 횟수 제한 + 로깅 |
| 동시 실행 충돌 | 낙관적 락(Optimistic Locking) |
| 조건 평가 성능 | 인덱스 + 캐싱 |

### 4.3 SLA
| 엣지 케이스 | 해결책 |
|------------|--------|
| 휴일/휴근 처리 | BusinessCalendar 모델 확장 |
| 여러 SLA 정책 충돌 | 우선순위 기반 선택 |
| 시간대(Timezone) 문제 | UTC 저장 + 클라이언트 변환 |

---

## 5. AI 통합 전략

### 5.1 Workflow AI Assistant
- **스마트 전이 추천**: 티켓 내용 분석하여 다음 상태 추천
- **워크플로우 최적화**: 유사 티켓 처리 패턴 분석하여 워크플로우 개선 제안

### 5.2 Automation AI
- **자동 태깅**: 티켓 내용으로 자동 태그 생성
- **우선순위 예측**: 고객 감정/긴급도 분석하여 우선순위 자동 조정
- **담당자 추천**: 과거 처리 이력 기반 최적 담당자 추천

### 5.3 SLA AI
- **위반 예측**: 켓 복잡도 분석하여 SLA 위반 가능성 예측
- **동적 SLA 조정**: 고객 등급/이력 기반 SLA 유연 적용

---

## 6. 데이터 모델 요약

```prisma
// 핵심 추가 모델
model Workflow { ... }
model WorkflowState { ... }
model WorkflowTransition { ... }
model AutomationRule { ... }
model AutomationLog { ... }
model Conversation { ... }
model Message { ... }

// 기존 모델 확장
model Ticket {
  workflowId String?
  workflow   Workflow? @relation(...)
}
```

---

**결론**: 이 로드맵을 통해 Zendesk/Freshdesk/Jira의 핵심 기능을 오마주하면서, AI 기술로 차별화된 사용자 경험을 제공할 수 있습니다. 단계적 구현을 통해 안정적인 고도화가 가능합니다.
