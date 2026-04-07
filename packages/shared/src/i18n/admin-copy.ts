export type AdminLocale = "ko" | "en";

export interface AdminCopy {
  [key: string]: string;
  locale: AdminLocale;
  // Navigation
  navDashboard: string;
  navTickets: string;
  navAgents: string;
  navTeams: string;
  navCustomers: string;
  navCalendar: string;
  navKnowledge: string;
  navTemplates: string;
  navAuditLogs: string;
  navSettings: string;
  // Settings sub-menu
  settingsEmail: string;
  settingsBranding: string;
  settingsBusinessHours: string;
  settingsOperations: string;
  settingsLLM: string;
  settingsSAML: string;
  settingsGit: string;
  settingsRequestTypes: string;
  settingsCustomFields: string;
  settingsSystem: string;
  // Dashboard
  dashboardTitle: string;
  dashboardWelcome: string;
  // Tickets
  ticketsTitle: string;
  ticketsSearch: string;
  ticketsFilter: string;
  ticketsNewTicket: string;
  ticketsStatusOpen: string;
  ticketsStatusInProgress: string;
  ticketsStatusWaiting: string;
  ticketsStatusResolved: string;
  ticketsStatusClosed: string;
  ticketsPriorityLow: string;
  ticketsPriorityMedium: string;
  ticketsPriorityHigh: string;
  ticketsPriorityUrgent: string;
  // Ticket detail
  ticketDetailTitle: string;
  ticketDetailComments: string;
  ticketDetailInternalNotes: string;
  ticketDetailAssignee: string;
  ticketDetailCategory: string;
  ticketDetailStatus: string;
  ticketDetailPriority: string;
  ticketDetailResolution: string;
  ticketDetailAddComment: string;
  ticketDetailAddInternalNote: string;
  ticketDetailStatusChange: string;
  ticketDetailAssigneeChange: string;
  ticketDetailStatusChangePlaceholder: string;
  // Agents
  agentsTitle: string;
  agentsNewAgent: string;
  agentsName: string;
  agentsEmail: string;
  agentsRole: string;
  agentsRoleAdmin: string;
  agentsRoleAgent: string;
  agentsRoleViewer: string;
  agentsIsActive: string;
  agentsCategories: string;
  agentsMaxTickets: string;
  agentsSave: string;
  agentsCancel: string;
  // Teams
  teamsTitle: string;
  teamsNewTeam: string;
  teamsName: string;
  teamsMembers: string;
  teamsLead: string;
  teamsSave: string;
  teamsCancel: string;
  // Customers
  customersTitle: string;
  customersName: string;
  customersEmail: string;
  customersOrganization: string;
  customersPhone: string;
  // Knowledge
  knowledgeTitle: string;
  knowledgeNewArticle: string;
  knowledgeSearch: string;
  knowledgeCategories: string;
  knowledgeStatus: string;
  knowledgeStatusDraft: string;
  knowledgeStatusPublished: string;
  knowledgeStatusArchived: string;
  // Templates
  templatesTitle: string;
  templatesNewTemplate: string;
  templatesName: string;
  templatesContent: string;
  templatesCategory: string;
  templatesVariables: string;
  templatesSave: string;
  templatesCancel: string;
  // Audit logs
  auditLogsTitle: string;
  auditLogsSearch: string;
  auditLogsFilter: string;
  auditLogsAction: string;
  auditLogsActor: string;
  auditLogsTimestamp: string;
  // Common
  commonSave: string;
  commonCancel: string;
  commonDelete: string;
  commonEdit: string;
  commonView: string;
  commonCreate: string;
  commonUpdate: string;
  commonYes: string;
  commonNo: string;
  commonLoading: string;
  commonNotFound: string;
  commonError: string;
  commonSuccess: string;
  // Business hours
  businessHoursTitle: string;
  businessHoursTimezone: string;
  businessHoursWorkStart: string;
  businessHoursWorkEnd: string;
  businessHoursWorkDays: string;
  businessHoursHolidays: string;
  businessHoursAddHoliday: string;
  businessHoursHolidayName: string;
  businessHoursDate: string;
  businessHoursRecurring: string;
  businessHoursDeleteHoliday: string;
  // Days of week
  daySunday: string;
  dayMonday: string;
  dayTuesday: string;
  dayWednesday: string;
  dayThursday: string;
  dayFriday: string;
  daySaturday: string;
}

const ADMIN_COPY: Record<AdminLocale, AdminCopy> = {
  ko: {
    locale: "ko",
    // Navigation
    navDashboard: "대시보드",
    navTickets: "티켓 목록",
    navAgents: "상담원 관리",
    navTeams: "팀 관리",
    navCustomers: "고객 관리",
    navCalendar: "일정 관리",
    navKnowledge: "지식",
    navTemplates: "응답 템플릿",
    navAuditLogs: "감사 로그",
    navSettings: "설정",
    // Settings sub-menu
    settingsEmail: "이메일 연동",
    settingsBranding: "브랜딩",
    settingsBusinessHours: "영업시간",
    settingsOperations: "운영 정책",
    settingsLLM: "AI 연동",
    settingsSAML: "SAML SSO",
    settingsGit: "Git 연동",
    settingsRequestTypes: "문의 유형",
    settingsCustomFields: "사용자 정의 필드",
    settingsSystem: "시스템",
    // Dashboard
    dashboardTitle: "대시보드",
    dashboardWelcome: "안녕하세요",
    // Tickets
    ticketsTitle: "티켓 목록",
    ticketsSearch: "검색",
    ticketsFilter: "필터",
    ticketsNewTicket: "새 티켓",
    ticketsStatusOpen: "접수됨",
    ticketsStatusInProgress: "처리 중",
    ticketsStatusWaiting: "보류 중",
    ticketsStatusResolved: "해결됨",
    ticketsStatusClosed: "종료됨",
    ticketsPriorityLow: "낮음",
    ticketsPriorityMedium: "보통",
    ticketsPriorityHigh: "높음",
    ticketsPriorityUrgent: "긴급",
    // Ticket detail
    ticketDetailTitle: "티켓 상세",
    ticketDetailComments: "댓글",
    ticketDetailInternalNotes: "내부 메모",
    ticketDetailAssignee: "담당자",
    ticketDetailCategory: "카테고리",
    ticketDetailStatus: "상태",
    ticketDetailPriority: "우선순위",
    ticketDetailResolution: "해결 내용",
    ticketDetailAddComment: "댓글 추가",
    ticketDetailAddInternalNote: "내부 메모 추가",
    ticketDetailStatusChange: "상태 변경",
    ticketDetailAssigneeChange: "담당자 변경",
    ticketDetailStatusChangePlaceholder: "상태를 선택하세요",
    // Agents
    agentsTitle: "상담원 관리",
    agentsNewAgent: "새 상담원",
    agentsName: "이름",
    agentsEmail: "이메일",
    agentsRole: "역할",
    agentsRoleAdmin: "관리자",
    agentsRoleAgent: "상담원",
    agentsRoleViewer: "조회자",
    agentsIsActive: "활성 상태",
    agentsCategories: "카테고리",
    agentsMaxTickets: "최대 티켓 수",
    agentsSave: "저장",
    agentsCancel: "취소",
    // Teams
    teamsTitle: "팀 관리",
    teamsNewTeam: "새 팀",
    teamsName: "팀 이름",
    teamsMembers: "구성원",
    teamsLead: "팀장",
    teamsSave: "저장",
    teamsCancel: "취소",
    // Customers
    customersTitle: "고객 관리",
    customersName: "이름",
    customersEmail: "이메일",
    customersOrganization: "소속/회사",
    customersPhone: "전화번호",
    // Knowledge
    knowledgeTitle: "지식",
    knowledgeNewArticle: "새 문서",
    knowledgeSearch: "검색",
    knowledgeCategories: "카테고리",
    knowledgeStatus: "상태",
    knowledgeStatusDraft: "초안",
    knowledgeStatusPublished: "게시됨",
    knowledgeStatusArchived: "보관됨",
    // Templates
    templatesTitle: "응답 템플릿",
    templatesNewTemplate: "새 템플릿",
    templatesName: "이름",
    templatesContent: "내용",
    templatesCategory: "카테고리",
    templatesVariables: "변수",
    templatesSave: "저장",
    templatesCancel: "취소",
    // Audit logs
    auditLogsTitle: "감사 로그",
    auditLogsSearch: "검색",
    auditLogsFilter: "필터",
    auditLogsAction: "동작",
    auditLogsActor: "수행자",
    auditLogsTimestamp: "시간",
    // Common
    commonSave: "저장",
    commonCancel: "취소",
    commonDelete: "삭제",
    commonEdit: "수정",
    commonView: "보기",
    commonCreate: "생성",
    commonUpdate: "업데이트",
    commonYes: "예",
    commonNo: "아니오",
    commonLoading: "로딩 중...",
    commonNotFound: "찾을 수 없습니다",
    commonError: "오류가 발생했습니다",
    commonSuccess: "완료되었습니다",
    // Business hours
    businessHoursTitle: "영업시간 설정",
    businessHoursTimezone: "시간대",
    businessHoursWorkStart: "업무 시작 시간",
    businessHoursWorkEnd: "업무 종료 시간",
    businessHoursWorkDays: "근무일",
    businessHoursHolidays: "공휴일/휴무일",
    businessHoursAddHoliday: "휴일 추가",
    businessHoursHolidayName: "휴일 이름",
    businessHoursDate: "날짜",
    businessHoursRecurring: "매년 반복",
    businessHoursDeleteHoliday: "삭제",
    // Days of week
    daySunday: "일",
    dayMonday: "월",
    dayTuesday: "화",
    dayWednesday: "수",
    dayThursday: "목",
    dayFriday: "금",
    daySaturday: "토",
  },
  en: {
    locale: "en",
    // Navigation
    navDashboard: "Dashboard",
    navTickets: "Tickets",
    navAgents: "Agents",
    navTeams: "Teams",
    navCustomers: "Customers",
    navCalendar: "Calendar",
    navKnowledge: "Knowledge",
    navTemplates: "Templates",
    navAuditLogs: "Audit Logs",
    navSettings: "Settings",
    // Settings sub-menu
    settingsEmail: "Email Integration",
    settingsBranding: "Branding",
    settingsBusinessHours: "Business Hours",
    settingsOperations: "Operations Policy",
    settingsLLM: "AI Integration",
    settingsSAML: "SAML SSO",
    settingsGit: "Git Integration",
    settingsRequestTypes: "Request Types",
    settingsCustomFields: "Custom Fields",
    settingsSystem: "System",
    // Dashboard
    dashboardTitle: "Dashboard",
    dashboardWelcome: "Welcome",
    // Tickets
    ticketsTitle: "Tickets",
    ticketsSearch: "Search",
    ticketsFilter: "Filter",
    ticketsNewTicket: "New Ticket",
    ticketsStatusOpen: "Open",
    ticketsStatusInProgress: "In Progress",
    ticketsStatusWaiting: "Waiting",
    ticketsStatusResolved: "Resolved",
    ticketsStatusClosed: "Closed",
    ticketsPriorityLow: "Low",
    ticketsPriorityMedium: "Medium",
    ticketsPriorityHigh: "High",
    ticketsPriorityUrgent: "Urgent",
    // Ticket detail
    ticketDetailTitle: "Ticket Details",
    ticketDetailComments: "Comments",
    ticketDetailInternalNotes: "Internal Notes",
    ticketDetailAssignee: "Assignee",
    ticketDetailCategory: "Category",
    ticketDetailStatus: "Status",
    ticketDetailPriority: "Priority",
    ticketDetailResolution: "Resolution",
    ticketDetailAddComment: "Add Comment",
    ticketDetailAddInternalNote: "Add Internal Note",
    ticketDetailStatusChange: "Change Status",
    ticketDetailAssigneeChange: "Change Assignee",
    ticketDetailStatusChangePlaceholder: "Select status",
    // Agents
    agentsTitle: "Agents",
    agentsNewAgent: "New Agent",
    agentsName: "Name",
    agentsEmail: "Email",
    agentsRole: "Role",
    agentsRoleAdmin: "Admin",
    agentsRoleAgent: "Agent",
    agentsRoleViewer: "Viewer",
    agentsIsActive: "Active Status",
    agentsCategories: "Categories",
    agentsMaxTickets: "Max Tickets",
    agentsSave: "Save",
    agentsCancel: "Cancel",
    // Teams
    teamsTitle: "Teams",
    teamsNewTeam: "New Team",
    teamsName: "Team Name",
    teamsMembers: "Members",
    teamsLead: "Team Lead",
    teamsSave: "Save",
    teamsCancel: "Cancel",
    // Customers
    customersTitle: "Customers",
    customersName: "Name",
    customersEmail: "Email",
    customersOrganization: "Organization",
    customersPhone: "Phone",
    // Knowledge
    knowledgeTitle: "Knowledge",
    knowledgeNewArticle: "New Article",
    knowledgeSearch: "Search",
    knowledgeCategories: "Categories",
    knowledgeStatus: "Status",
    knowledgeStatusDraft: "Draft",
    knowledgeStatusPublished: "Published",
    knowledgeStatusArchived: "Archived",
    // Templates
    templatesTitle: "Response Templates",
    templatesNewTemplate: "New Template",
    templatesName: "Name",
    templatesContent: "Content",
    templatesCategory: "Category",
    templatesVariables: "Variables",
    templatesSave: "Save",
    templatesCancel: "Cancel",
    // Audit logs
    auditLogsTitle: "Audit Logs",
    auditLogsSearch: "Search",
    auditLogsFilter: "Filter",
    auditLogsAction: "Action",
    auditLogsActor: "Actor",
    auditLogsTimestamp: "Timestamp",
    // Common
    commonSave: "Save",
    commonCancel: "Cancel",
    commonDelete: "Delete",
    commonEdit: "Edit",
    commonView: "View",
    commonCreate: "Create",
    commonUpdate: "Update",
    commonYes: "Yes",
    commonNo: "No",
    commonLoading: "Loading...",
    commonNotFound: "Not found",
    commonError: "An error occurred",
    commonSuccess: "Success",
    // Business hours
    businessHoursTitle: "Business Hours Settings",
    businessHoursTimezone: "Timezone",
    businessHoursWorkStart: "Work Start Hour",
    businessHoursWorkEnd: "Work End Hour",
    businessHoursWorkDays: "Work Days",
    businessHoursHolidays: "Holidays",
    businessHoursAddHoliday: "Add Holiday",
    businessHoursHolidayName: "Holiday Name",
    businessHoursDate: "Date",
    businessHoursRecurring: "Recurring",
    businessHoursDeleteHoliday: "Delete",
    // Days of week
    daySunday: "Sun",
    dayMonday: "Mon",
    dayTuesday: "Tue",
    dayWednesday: "Wed",
    dayThursday: "Thu",
    dayFriday: "Fri",
    daySaturday: "Sat",
  },
};

const ADMIN_COPY_EXTRA: Record<AdminLocale, Record<string, string>> = {
  ko: {
    sectionSettings: "설정",
    sectionTools: "도구",
    sectionLogs: "로그",
    navAnalytics: "분석 및 리포트",
    navChats: "실시간 채팅",
    settingsIntegrations: "연동 설정",
    settingsChatSettings: "채팅 설정",
    commonOpenMenu: "메뉴 열기",
    commonCloseMenu: "메뉴 닫기",
    commonLogout: "로그아웃",
    commonUnknown: "알 수 없음",
    commonActions: "작업",
    commonChannel: "채널",
    commonDescription: "설명",
    commonName: "이름",
    commonEmail: "이메일",
    commonPassword: "비밀번호",
    commonTitle: "제목",
    commonSearch: "검색",
    commonSearching: "검색 중...",
    commonCreating: "생성 중...",
    commonSending: "전송 중...",
    commonConnected: "연결됨",
    commonDisconnect: "연결 해제",
    commonAll: "전체",
    commonNone: "없음",
    commonConfirm: "선택해주세요",
    commonRequired: "필수",
    commonRequiredField: "필수 필드",
    commonActivate: "활성화",
    commonDeactivate: "비활성화",
    commonKey: "키",
    commonType: "타입",
    commonOptions: "옵션",
    commonBackToQueue: "채팅 큐로 돌아가기",
    loginTitle: "관리 콘솔",
    loginDescription: "관리자 계정으로 로그인하세요",
    loginFailed: "로그인에 실패했습니다",
    loginSubmit: "로그인",
    loginContinueWithGoogle: "Google로 계속하기",
    loginContinueWithGithub: "GitHub로 계속하기",
    loginOAuthFooter: "OAuth 공급자 설정은 환경변수를 통해 활성화됩니다.",
    changePasswordTitle: "비밀번호 변경",
    changePasswordDescription: "최초 로그인을 환영합니다! 보안을 위해 새로운 비밀번호를 설정해주세요.",
    changePasswordSwitchAccount: "다른 계정으로 로그인",
    changePasswordCurrentPassword: "현재 비밀번호",
    changePasswordCurrentPasswordPlaceholder: "현재 비밀번호를 입력하세요",
    changePasswordNewPassword: "새 비밀번호",
    changePasswordNewPasswordPlaceholder: "새 비밀번호 (최소 8자)",
    changePasswordConfirmPassword: "새 비밀번호 확인",
    changePasswordConfirmPasswordPlaceholder: "새 비밀번호를 다시 입력하세요",
    changePasswordMismatch: "새 비밀번호와 확인 비밀번호가 일치하지 않습니다.",
    changePasswordTooShort: "새 비밀번호는 최소 8자 이상이어야 합니다.",
    changePasswordError: "비밀번호 변경 중 오류가 발생했습니다.",
    changePasswordSuccess: "비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.",
    changePasswordSubmit: "비밀번호 변경",
    analyticsAiInsightTitle: "AI 데이터 해석",
    analyticsTotalTickets: "총 티켓",
    analyticsAverageFirstResponse: "평균 첫 응답",
    analyticsAverageResolutionTime: "평균 해결 시간",
    analyticsAverageCsat: "고객 만족도 평균",
    analyticsRepeatCustomers: "반복 고객",
    analyticsVipCustomers: "VIP 고객",
    analyticsOpenTicketsAction: "열린 티켓 보기",
    analyticsUrgentTicketsTitle: "긴급 티켓 우선 처리",
    analyticsUrgentTicketsDescription: "우선순위가 높은 티켓을 먼저 확인해 SLA 위험을 낮춥니다.",
    analyticsUrgentTicketsAction: "긴급 티켓 보기",
    analyticsRepeatCustomerReviewTitle: "반복 고객 점검",
    analyticsVipCustomerReviewTitle: "VIP 고객 확인",
    analyticsViewCustomers: "고객 목록 보기",
    analyticsViewVipCustomers: "VIP 고객 보기",
    analyticsViewRelatedTickets: "관련 티켓 보기",
    analyticsTabOverview: "개요",
    analyticsTabAgents: "상담원",
    analyticsTabCustomers: "고객",
    chatsAnalyticsTitle: "채팅 분석",
    chatsAnalyticsDescription: "실시간 채팅 운영 지표와 SLA 위험 대화를 확인합니다.",
    chatsTotalConversations: "전체 대화",
    chatsAverageConversationLength: "평균 대화 길이",
    chatsSlaBreached: "SLA 초과",
    chatsRiskyConversations: "SLA 위험 대화",
    chatsAgentPerformance: "상담원별 채팅 성과",
    chatsPageDescription: "실시간 채팅 세션을 티켓처럼 배정하고 관리합니다.",
    chatsAnalyticsLink: "채팅 분석 보기",
    chatsWaitingAgent: "대기 중",
    chatsWaitingCustomer: "응답 대기",
    chatsActiveConversations: "활성 대화",
    commonNoResults: "현재 SLA 위험 대화가 없습니다.",
    commonNoData: "성과 데이터가 없습니다.",
    calendarTitle: "상담원 일정 관리",
    calendarLoadFailed: "일정을 불러오는 중 오류가 발생했습니다.",
    calendarAgentsLoadFailed: "상담원 목록을 불러오는 중 오류가 발생했습니다.",
    calendarCreateSuccess: "일정이 등록되었습니다.",
    calendarUpdateSuccess: "일정이 수정되었습니다.",
    calendarSaveFailed: "일정 저장 중 오류가 발생했습니다.",
    calendarDeleteConfirm: "정말 삭제하시겠습니까?",
    calendarDeleteSuccess: "일정이 삭제되었습니다.",
    calendarDeleteFailed: "일정 삭제 중 오류가 발생했습니다.",
    calendarEditTitle: "일정 수정",
    calendarCreateTitle: "일정 등록",
    calendarAgentLabel: "상담원",
    calendarAgentPlaceholder: "상담원을 선택하세요",
    calendarTypeLabel: "일정 유형",
    calendarTitlePlaceholder: "일정 제목을 입력하세요",
    calendarDescriptionPlaceholder: "추가 설명을 입력하세요 (선택사항)",
    calendarStartDateLabel: "시작일",
    calendarEndDateLabel: "종료일",
    businessHoursLoadFailed: "설정을 불러오지 못했습니다.",
    businessHoursSaveSuccess: "영업시간 설정이 저장되었습니다.",
    businessHoursSaveFailed: "저장에 실패했습니다. 다시 시도해 주세요.",
    businessHoursHolidayRequired: "휴일 이름과 날짜를 입력해 주세요.",
    businessHoursWorkDayRequired: "최소 하나 이상의 근무일을 선택해 주세요.",
    brandingUploadFailed: "파일 업로드에 실패했습니다.",
    brandingSaveSuccess: "브랜딩 설정이 저장되었습니다.",
    brandingSaveFailed: "브랜딩 설정 저장에 실패했습니다.",
    emailSaveSuccess: "이메일 설정이 저장되었습니다.",
    emailSaveFailed: "이메일 설정 저장에 실패했습니다.",
    requestTypeError: "오류가 발생했습니다",
    requestTypeStatusFailed: "상태 변경에 실패했습니다",
    requestTypeDeleteFailed: "삭제에 실패했습니다",
    requestTypeDeleteSuccess: "삭제되었습니다",
    requestTypeSaveSuccess: "생성되었습니다",
    requestTypeUpdateSuccess: "수정되었습니다",
    requestTypeCreateButton: "문의 유형 추가",
    requestTypeNewTitle: "새 문의 유형",
    requestTypeEditTitle: "문의 유형 수정",
    requestTypePriority: "기본 우선순위",
    requestTypeTeam: "기본 팀",
    requestTypeAutoAssign: "자동 배정",
    requestTypeTicketCount: "티켓 수",
    customFieldKeyRequired: "키는 필수입니다.",
    customFieldKeyInvalid: "키는 영문, 숫자, 언더스코어만 사용 가능합니다.",
    customFieldNameRequired: "이름은 필수입니다.",
    customFieldOptionsRequired: "옵션은 필수입니다.",
    customFieldEditTitle: "커스텀 필드 수정",
    customFieldNewTitle: "새 커스텀 필드",
    customFieldTypeText: "텍스트",
    customFieldTypeNumber: "숫자",
    customFieldTypeDate: "날짜",
    customFieldTypeBoolean: "체크박스",
    customFieldTypeSelect: "단일 선택",
    customFieldTypeMultiSelect: "다중 선택",
    customFieldNamePlaceholder: "예: 주문 번호, 제품 유형",
    customFieldDescriptionPlaceholder: "필드에 대한 추가 설명",
    customFieldOptionPlaceholder: "옵션1, 옵션2, 옵션3 (쉼표로 구분)",
    customFieldKeyExamplePlaceholder: "예: order_id, product_type",
    customFieldSaveSuccess: "필드가 저장되었습니다.",
    customFieldSaveError: "저장 중 오류가 발생했습니다.",
    customFieldActivateSuccess: "필드가 활성화되었습니다.",
    customFieldDeactivateSuccess: "필드가 비활성화되었습니다.",
    customFieldStatusError: "상태 변경 중 오류가 발생했습니다.",
    customFieldDeleteSuccess: "필드가 삭제되었습니다.",
    customFieldDeleteError: "삭제 중 오류가 발생했습니다.",
    slaPolicyTitle: "SLA 정책 관리",
    slaPolicyDescription: "우선순위별 첫 응답 및 해결 목표 시간을 운영 기준으로 관리합니다.",
    slaPolicyAdd: "정책 추가",
    slaPolicyLoading: "정책을 불러오는 중...",
    slaPolicyEmpty: "등록된 SLA 정책이 없습니다.",
    slaPolicySaveSuccess: "SLA 정책이 저장되었습니다.",
    slaPolicyCreateSuccess: "SLA 정책이 생성되었습니다.",
    slaPolicySaveError: "SLA 정책 저장에 실패했습니다.",
    slaPolicyDeleteSuccess: "SLA 정책이 삭제되었습니다.",
    slaPolicyDeleteError: "SLA 정책 삭제에 실패했습니다.",
    slaPolicyDeleteConfirm: "이 SLA 정책을 삭제하시겠습니까?",
    slaPolicyPriority: "우선순위",
    slaPolicyFirstResponse: "첫 응답",
    slaPolicyResolution: "해결 목표",
    slaPolicyRunning: "운영중",
    slaPolicyStopped: "중지됨",
    slaPolicyNoDescription: "설명 없음",
    slaPolicyActivateSuccess: "정책이 활성화되었습니다.",
    slaPolicyDeactivateSuccess: "정책이 비활성화되었습니다.",
    slaPolicyStatusError: "SLA 정책 상태 변경에 실패했습니다.",
    slaPolicySaving: "저장 중...",
    automationTitle: "자동화 규칙 관리",
    automationDescription: "트리거와 조건에 따라 티켓 상태, 우선순위, 담당자, 태그, 알림을 자동으로 제어합니다.",
    automationAdd: "규칙 추가",
    automationLoading: "자동화 규칙을 불러오는 중...",
    automationEmpty: "등록된 자동화 규칙이 없습니다.",
    automationCreateSuccess: "자동화 규칙이 생성되었습니다.",
    automationUpdateSuccess: "자동화 규칙이 수정되었습니다.",
    automationSaveFailed: "자동화 규칙 저장에 실패했습니다.",
    automationDeleteSuccess: "자동화 규칙이 삭제되었습니다.",
    automationDeleteFailed: "자동화 규칙 삭제에 실패했습니다.",
    automationDeleteConfirm: "이 자동화 규칙을 삭제하시겠습니까?",
    automationNoDescription: "설명 없음",
    automationConditions: "조건",
    automationActions: "동작",
    automationActivateSuccess: "규칙이 활성화되었습니다.",
    automationDeactivateSuccess: "규칙이 비활성화되었습니다.",
    automationStatusFailed: "자동화 규칙 상태 변경에 실패했습니다.",
  },
  en: {
    sectionSettings: "Settings",
    sectionTools: "Tools",
    sectionLogs: "Logs",
    navAnalytics: "Analytics & Reports",
    navChats: "Live Chat",
    settingsIntegrations: "Integrations",
    settingsChatSettings: "Chat Settings",
    commonOpenMenu: "Open menu",
    commonCloseMenu: "Close menu",
    commonLogout: "Log out",
    commonUnknown: "Unknown",
    commonActions: "Actions",
    commonChannel: "Channel",
    commonDescription: "Description",
    commonName: "Name",
    commonEmail: "Email",
    commonPassword: "Password",
    commonTitle: "Title",
    commonSearch: "Search",
    commonSearching: "Searching...",
    commonCreating: "Creating...",
    commonSending: "Sending...",
    commonConnected: "Connected",
    commonDisconnect: "Disconnect",
    commonAll: "All",
    commonNone: "None",
    commonConfirm: "Please select",
    commonRequired: "Required",
    commonRequiredField: "Required field",
    commonActivate: "Activate",
    commonDeactivate: "Deactivate",
    commonKey: "Key",
    commonType: "Type",
    commonOptions: "Options",
    commonBackToQueue: "Back to chat queue",
    loginTitle: "Admin Console",
    loginDescription: "Sign in with your admin account",
    loginFailed: "Sign-in failed",
    loginSubmit: "Sign in",
    loginContinueWithGoogle: "Continue with Google",
    loginContinueWithGithub: "Continue with GitHub",
    loginOAuthFooter: "OAuth providers are enabled through environment variables.",
    changePasswordTitle: "Change Password",
    changePasswordDescription: "Welcome to your first sign-in. Set a new password for security.",
    changePasswordSwitchAccount: "Sign in with another account",
    changePasswordCurrentPassword: "Current password",
    changePasswordCurrentPasswordPlaceholder: "Enter your current password",
    changePasswordNewPassword: "New password",
    changePasswordNewPasswordPlaceholder: "New password (minimum 8 characters)",
    changePasswordConfirmPassword: "Confirm new password",
    changePasswordConfirmPasswordPlaceholder: "Re-enter your new password",
    changePasswordMismatch: "The new password and confirmation do not match.",
    changePasswordTooShort: "The new password must be at least 8 characters.",
    changePasswordError: "An error occurred while changing the password.",
    changePasswordSuccess: "Your password has been changed. Please sign in again with the new password.",
    changePasswordSubmit: "Change password",
    analyticsAiInsightTitle: "AI Insights",
    analyticsTotalTickets: "Total tickets",
    analyticsAverageFirstResponse: "Avg. first response",
    analyticsAverageResolutionTime: "Avg. resolution time",
    analyticsAverageCsat: "Avg. CSAT",
    analyticsRepeatCustomers: "Repeat customers",
    analyticsVipCustomers: "VIP customers",
    analyticsOpenTicketsAction: "View open tickets",
    analyticsUrgentTicketsTitle: "Prioritize urgent tickets",
    analyticsUrgentTicketsDescription: "Review high-priority tickets first to reduce SLA risk.",
    analyticsUrgentTicketsAction: "View urgent tickets",
    analyticsRepeatCustomerReviewTitle: "Review repeat customers",
    analyticsVipCustomerReviewTitle: "Review VIP customers",
    analyticsViewCustomers: "View customers",
    analyticsViewVipCustomers: "View VIP customers",
    analyticsViewRelatedTickets: "View related tickets",
    analyticsTabOverview: "Overview",
    analyticsTabAgents: "Agents",
    analyticsTabCustomers: "Customers",
    chatsAnalyticsTitle: "Chat Analytics",
    chatsAnalyticsDescription: "Review live chat operating metrics and SLA-risk conversations.",
    chatsTotalConversations: "Total conversations",
    chatsAverageConversationLength: "Avg. conversation length",
    chatsSlaBreached: "SLA breached",
    chatsRiskyConversations: "SLA-risk conversations",
    chatsAgentPerformance: "Agent chat performance",
    chatsPageDescription: "Assign and manage live chat sessions like tickets.",
    chatsAnalyticsLink: "View chat analytics",
    chatsWaitingAgent: "Waiting for agent",
    chatsWaitingCustomer: "Waiting for customer",
    chatsActiveConversations: "Active conversations",
    commonNoResults: "There are no SLA-risk conversations right now.",
    commonNoData: "No performance data available.",
    calendarTitle: "Agent schedule management",
    calendarLoadFailed: "An error occurred while loading schedules.",
    calendarAgentsLoadFailed: "An error occurred while loading agents.",
    calendarCreateSuccess: "Schedule created.",
    calendarUpdateSuccess: "Schedule updated.",
    calendarSaveFailed: "An error occurred while saving the schedule.",
    calendarDeleteConfirm: "Are you sure you want to delete this schedule?",
    calendarDeleteSuccess: "Schedule deleted.",
    calendarDeleteFailed: "An error occurred while deleting the schedule.",
    calendarEditTitle: "Edit schedule",
    calendarCreateTitle: "Create schedule",
    calendarAgentLabel: "Agent",
    calendarAgentPlaceholder: "Select an agent",
    calendarTypeLabel: "Schedule type",
    calendarTitlePlaceholder: "Enter a schedule title",
    calendarDescriptionPlaceholder: "Enter additional details (optional)",
    calendarStartDateLabel: "Start date",
    calendarEndDateLabel: "End date",
    businessHoursLoadFailed: "Failed to load settings.",
    businessHoursSaveSuccess: "Business hours saved.",
    businessHoursSaveFailed: "Failed to save. Please try again.",
    businessHoursHolidayRequired: "Enter a holiday name and date.",
    businessHoursWorkDayRequired: "Select at least one business day.",
    brandingUploadFailed: "File upload failed.",
    brandingSaveSuccess: "Branding settings saved.",
    brandingSaveFailed: "Failed to save branding settings.",
    emailSaveSuccess: "Email settings saved.",
    emailSaveFailed: "Failed to save email settings.",
    requestTypeError: "An error occurred.",
    requestTypeStatusFailed: "Failed to change status.",
    requestTypeDeleteFailed: "Failed to delete.",
    requestTypeDeleteSuccess: "Deleted.",
    requestTypeSaveSuccess: "Created.",
    requestTypeUpdateSuccess: "Updated.",
    requestTypeCreateButton: "Add request type",
    requestTypeNewTitle: "New request type",
    requestTypeEditTitle: "Edit request type",
    requestTypePriority: "Default priority",
    requestTypeTeam: "Default team",
    requestTypeAutoAssign: "Auto-assign",
    requestTypeTicketCount: "Ticket count",
    customFieldKeyRequired: "Key is required.",
    customFieldKeyInvalid: "Key may contain only letters, numbers, and underscores.",
    customFieldNameRequired: "Name is required.",
    customFieldOptionsRequired: "Options are required.",
    customFieldEditTitle: "Edit custom field",
    customFieldNewTitle: "New custom field",
    customFieldTypeText: "Text",
    customFieldTypeNumber: "Number",
    customFieldTypeDate: "Date",
    customFieldTypeBoolean: "Checkbox",
    customFieldTypeSelect: "Single select",
    customFieldTypeMultiSelect: "Multi-select",
    customFieldNamePlaceholder: "Example: Order number, Product type",
    customFieldDescriptionPlaceholder: "Additional field description",
    customFieldOptionPlaceholder: "Option1, Option2, Option3 (comma-separated)",
    customFieldKeyExamplePlaceholder: "Example: order_id, product_type",
    customFieldSaveSuccess: "Field saved.",
    customFieldSaveError: "An error occurred while saving.",
    customFieldActivateSuccess: "Field activated.",
    customFieldDeactivateSuccess: "Field deactivated.",
    customFieldStatusError: "An error occurred while changing status.",
    customFieldDeleteSuccess: "Field deleted.",
    customFieldDeleteError: "An error occurred while deleting.",
    slaPolicyTitle: "SLA Policy Management",
    slaPolicyDescription: "Manage first response and resolution targets by priority.",
    slaPolicyAdd: "Add policy",
    slaPolicyLoading: "Loading policies...",
    slaPolicyEmpty: "No SLA policies have been created.",
    slaPolicySaveSuccess: "SLA policy saved.",
    slaPolicyCreateSuccess: "SLA policy created.",
    slaPolicySaveError: "Failed to save SLA policy.",
    slaPolicyDeleteSuccess: "SLA policy deleted.",
    slaPolicyDeleteError: "Failed to delete SLA policy.",
    slaPolicyDeleteConfirm: "Delete this SLA policy?",
    slaPolicyPriority: "Priority",
    slaPolicyFirstResponse: "First response",
    slaPolicyResolution: "Resolution target",
    slaPolicyRunning: "Running",
    slaPolicyStopped: "Stopped",
    slaPolicyNoDescription: "No description",
    slaPolicyActivateSuccess: "Policy activated.",
    slaPolicyDeactivateSuccess: "Policy deactivated.",
    slaPolicyStatusError: "Failed to change SLA policy status.",
    slaPolicySaving: "Saving...",
    automationTitle: "Automation Rules",
    automationDescription: "Automatically control ticket status, priority, assignee, tags, and notifications based on triggers and conditions.",
    automationAdd: "Add rule",
    automationLoading: "Loading automation rules...",
    automationEmpty: "No automation rules have been created.",
    automationCreateSuccess: "Automation rule created.",
    automationUpdateSuccess: "Automation rule updated.",
    automationSaveFailed: "Failed to save automation rule.",
    automationDeleteSuccess: "Automation rule deleted.",
    automationDeleteFailed: "Failed to delete automation rule.",
    automationDeleteConfirm: "Delete this automation rule?",
    automationNoDescription: "No description",
    automationConditions: "Conditions",
    automationActions: "Actions",
    automationActivateSuccess: "Rule activated.",
    automationDeactivateSuccess: "Rule deactivated.",
    automationStatusFailed: "Failed to change automation rule status.",
  },
};

export function normalizeAdminLocale(value: string | null | undefined): AdminLocale {
  return value === "en" ? "en" : "ko";
}

export function getAdminCopy(locale: string | null | undefined): AdminCopy {
  const normalized = normalizeAdminLocale(locale);
  return {
    ...ADMIN_COPY[normalized],
    ...ADMIN_COPY_EXTRA[normalized],
  };
}
