export type AdminLocale = "ko" | "en";

export interface AdminCopy {
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

export function normalizeAdminLocale(value: string | null | undefined): AdminLocale {
  return value === "en" ? "en" : "ko";
}

export function getAdminCopy(locale: string | null | undefined): AdminCopy {
  return ADMIN_COPY[normalizeAdminLocale(locale)];
}
