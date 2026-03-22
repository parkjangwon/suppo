export type HelpdeskCapabilityKey =
  | "sla"
  | "automation"
  | "queues"
  | "customer360"
  | "ticketRelations"
  | "rbac"
  | "integrations"
  | "localization"
  | "aiAutomation";

export interface HelpdeskCapabilityDefinition {
  key: HelpdeskCapabilityKey;
  title: string;
  status: "live" | "foundation" | "expanding";
  summary: string;
  concreteFeatures: string[];
  href?: string;
  supportedLocales?: string[];
}

export const HELPDESK_CAPABILITY_DEFINITIONS: HelpdeskCapabilityDefinition[] = [
  {
    key: "sla",
    title: "SLA/응답 기한 관리",
    status: "live",
    summary: "첫 응답과 해결 목표 시간을 우선순위별 정책으로 관리하고, 위반 임박과 위반 상태를 추적합니다.",
    concreteFeatures: [
      "우선순위별 첫 응답/해결 시간 정책",
      "SLA 경고 및 위반 추적",
      "티켓 목록의 SLA 임박 큐",
    ],
    href: "/admin/settings/operations",
  },
  {
    key: "automation",
    title: "자동화 규칙",
    status: "live",
    summary: "상태, 우선순위, 키워드, 고객 패턴을 조건으로 삼아 상태 변경, 재배정, 태그 부여, 알림 발송을 자동 처리합니다.",
    concreteFeatures: [
      "생성/수정 트리거 기반 규칙 실행",
      "상태·우선순위·담당자·팀 변경",
      "태그 추가/제거와 알림 발송",
    ],
    href: "/admin/settings/operations",
  },
  {
    key: "queues",
    title: "저장된 보기 / 운영 큐",
    status: "live",
    summary: "오늘 처리, 긴급, VIP, 내 담당, SLA 임박 같은 빠른 큐와 개인/공유 저장 보기를 제공합니다.",
    concreteFeatures: [
      "운영 프리셋 큐",
      "개인 저장 보기",
      "팀 공유 보기",
    ],
    href: "/admin/tickets",
  },
  {
    key: "customer360",
    title: "고객 360 타임라인",
    status: "expanding",
    summary: "고객별 최근 티켓, 만족도, 메모, 분석, 반복 문의 패턴을 하나의 흐름으로 보여줍니다.",
    concreteFeatures: [
      "고객 통계 인사이트",
      "최근 티켓 이력",
      "관리자 메모와 AI 분석",
    ],
    href: "/admin/customers",
  },
  {
    key: "ticketRelations",
    title: "티켓 병합 / 분할 / 부모-자식",
    status: "foundation",
    summary: "현재 병합 기능을 운영 표준으로 제공하고, 다음 단계로 분할과 부모-자식 관계를 확장할 수 있는 구조를 준비합니다.",
    concreteFeatures: [
      "중복 티켓 병합",
      "병합 이력 추적",
      "후속 분할/상위-하위 관계 확장 토대",
    ],
    href: "/admin/tickets",
  },
  {
    key: "rbac",
    title: "세분화된 권한 관리",
    status: "foundation",
    summary: "현재 관리자/상담원 권한 위에 팀장·읽기전용으로 확장할 수 있는 운영 규칙과 접근 안내를 마련합니다.",
    concreteFeatures: [
      "관리자 전용 정책 페이지 보호",
      "역할별 메뉴/페이지 가드",
      "팀장/읽기전용 확장 기준 정의",
    ],
    href: "/admin/agents",
  },
  {
    key: "integrations",
    title: "외부 연동/API/Webhook",
    status: "foundation",
    summary: "Git, 이메일, SAML, 내부 웹훅 엔드포인트를 운영 관점에서 한눈에 보고 확장 가능한 연결 지점을 정의합니다.",
    concreteFeatures: [
      "Git·이메일·SSO 운영 링크",
      "내부 웹훅 엔드포인트 정리",
      "CRM/ERP/모니터링 연동 확장 기준",
    ],
    href: "/admin/settings/operations",
  },
  {
    key: "localization",
    title: "다국어",
    status: "foundation",
    summary: "운영 기준 지원 언어를 한국어와 영어 두 가지로 고정하고, 향후 전역 i18n 적용 범위를 명확히 합니다.",
    concreteFeatures: [
      "지원 언어: 한국어, 영어",
      "기능 정의와 운영 정책의 이중 언어 기준",
      "전역 문자열 확장 토대",
    ],
    href: "/admin/settings/operations",
    supportedLocales: ["ko", "en"],
  },
  {
    key: "aiAutomation",
    title: "AI 자동 분류와 초안 생성",
    status: "expanding",
    summary: "기존 AI 답변 추천과 요약 기반 위에 자동 태깅, 자동 요약, 자동 라우팅으로 확장할 운영 기준을 제공합니다.",
    concreteFeatures: [
      "AI 답변 초안과 요약",
      "자동 태깅/자동 라우팅 기준 정의",
      "LLM 운영 설정과 연결",
    ],
    href: "/admin/settings/llm",
  },
];
