# Admin Console Full i18n Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all admin console UI components to use the existing `AdminCopy` i18n context so KO↔EN switching via the sidebar button actually changes all visible UI text.

**Architecture:** `AdminCopy` (in `packages/shared/src/i18n/admin-copy.ts`) is already populated with KO/EN strings and provided via `AdminCopyProvider` in `apps/admin/src/app/(admin)/layout.tsx`. The cookie (`suppo-admin-locale`) is already read server-side. Components just need to call `useAdminCopy()` and replace hardcoded Korean strings with the copy object properties. Task 1 expands AdminCopy with all missing keys; Tasks 2–15 wire each component group.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `packages/shared/src/i18n/admin-copy.ts`, `useAdminCopy()` hook from `@suppo/shared/i18n/admin-context`

**Scope:** Admin app only (`apps/admin/src/`). Does NOT touch public portal, DB data, LLM prompts, or API body values.

---

## What NOT to translate (leave as-is)

- `"관리자에 의한 비활성화"` — API request body value, not UI
- `"홍길동"` — example Korean name in placeholder, keep
- LLM system prompt text inside `textarea` defaults
- Dynamic strings with interpolated data like `마지막 사용: ${date}` — translate the label part separately
- URL slugs like `"문서-url-slug"` — format strings, not labels

---

## Task 1: Expand AdminCopy with all new keys

**Files:**
- Modify: `packages/shared/src/i18n/admin-copy.ts`

Add the following to the `AdminCopy` interface and both `ko` / `en` dictionaries.

- [ ] **Step 1: Add new keys to `AdminCopy` interface**

Open `packages/shared/src/i18n/admin-copy.ts`. After the last existing field in the interface (`daySaturday`), add:

```typescript
  // Nav section titles
  sectionSettings: string;
  sectionTools: string;
  sectionLogs: string;
  // Missing nav items
  navAnalytics: string;
  navChats: string;
  settingsChatSettings: string;
  settingsIntegrations: string;
  // Common additions
  commonAll: string;
  commonUnknown: string;
  commonSystem: string;
  commonActive: string;
  commonInactive: string;
  commonDeactivate: string;
  commonAdd: string;
  commonApply: string;
  commonClose: string;
  commonConfirm: string;
  commonSearch: string;
  commonSaveSettings: string;
  commonPublish: string;
  commonSaveDraft: string;
  commonUploadClick: string;
  commonSendTest: string;
  commonSend: string;
  commonSending: string;
  commonSaving: string;
  commonProcessing: string;
  commonSearching: string;
  commonCreating: string;
  commonDeleting: string;
  commonConnected: string;
  commonDisconnected: string;
  commonUnassigned: string;
  commonNone: string;
  commonNoDescription: string;
  // Ticket status short labels (for badges)
  ticketStatusOpen: string;
  ticketStatusInProgress: string;
  ticketStatusWaiting: string;
  ticketStatusResolved: string;
  ticketStatusClosed: string;
  // Ticket priority short labels (reuse ticketsPriority* for these)
  // Ticket filter/list
  ticketsSearchPlaceholder: string;
  ticketsFilterStatus: string;
  ticketsFilterPriority: string;
  ticketsFilterRequestType: string;
  ticketsFilterAssignee: string;
  ticketsDateFrom: string;
  ticketsDateTo: string;
  ticketsBulkStatus: string;
  ticketsBulkPriority: string;
  ticketsBulkAssignee: string;
  ticketsBulkApply: string;
  ticketsSelectAll: string;
  ticketsBulkSelectRequired: string;
  ticketsBulkSuccess: string;
  ticketsBulkFailed: string;
  // Ticket detail additions
  ticketDetailUnauthorized: string;
  ticketDetailUpdateSuccess: string;
  ticketDetailUpdateFailed: string;
  ticketDetailUnassigned: string;
  ticketDetailActorSystem: string;
  ticketDetailSourceTicket: string;
  ticketDetailTargetTicket: string;
  ticketDetailCurrentStatus: string;
  ticketDetailCanEdit: string;
  ticketDetailReadOnly: string;
  ticketDetailCanEditDesc: string;
  ticketDetailReadOnlyDesc: string;
  // Ticket merge / transfer
  ticketMergeSelectRequired: string;
  ticketMergeConflict: string;
  ticketMergeSuccess: string;
  ticketMergeFailed: string;
  ticketMergeReasonPlaceholder: string;
  ticketMergeValidate: string;
  ticketMergeFieldAssignee: string;
  ticketMergeFieldTeam: string;
  ticketMergeFieldStatus: string;
  ticketTransferLabel: string;
  ticketTransferSelectRequired: string;
  ticketTransferFailed: string;
  ticketTransferError: string;
  ticketTransferReasonPlaceholder: string;
  ticketTransferSubmitting: string;
  // Comment / internal note
  commentContentRequired: string;
  commentUpdateSuccess: string;
  commentUpdateFailed: string;
  commentDeleteSuccess: string;
  commentDeleteFailed: string;
  commentUpdateError: string;
  commentDeleteError: string;
  commentResponsePlaceholder: string;
  commentLockedPlaceholder: string;
  commentWriteAriaLabel: string;
  commentInternalNoteAriaLabel: string;
  commentAiSuggest: string;
  commentAiSuggestLoading: string;
  internalNoteContentRequired: string;
  internalNoteFailed: string;
  internalNoteError: string;
  internalNoteSubmitting: string;
  internalNoteSuccess: string;
  internalNoteResponseSuccess: string;
  internalNotePlaceholder: string;
  // Agent management
  agentsSearchPlaceholder: string;
  agentsNameEmailRequired: string;
  agentsAddFailed: string;
  agentsAddSuccess: string;
  agentsAddError: string;
  agentsEditFailed: string;
  agentsEditSuccess: string;
  agentsEditError: string;
  agentsDeactivateFailed: string;
  agentsDeactivateSuccess: string;
  agentsDeactivateError: string;
  agentsDeleteFailed: string;
  agentsDeleteSuccess: string;
  agentsDeleteError: string;
  agentsPasswordResetFailed: string;
  agentsPasswordResetError: string;
  agentsPhonePlaceholder: string;
  agentsTeamLeadPlaceholder: string;
  // Team management
  teamsDescriptionPlaceholder: string;
  teamsCreateSuccess: string;
  teamsCreateError: string;
  teamsStatusFailed: string;
  teamsStatusError: string;
  teamsDeactivateSuccess: string;
  teamsDeactivateError: string;
  // Customer
  customersSearchPlaceholder: string;
  customersNoHistory: string;
  customersOpenTickets: string;
  customersTotalTickets: string;
  customersCsat: string;
  customersRecentInquiry: string;
  // Knowledge
  knowledgeTitleRequired: string;
  knowledgeSlugRequired: string;
  knowledgeContentRequired: string;
  knowledgeCategoryRequired: string;
  knowledgeSaveSuccess: string;
  knowledgeSaveError: string;
  knowledgeDeleteSuccess: string;
  knowledgeDeleteError: string;
  knowledgeSearchPlaceholder: string;
  knowledgeTitlePlaceholder: string;
  knowledgeSummaryPlaceholder: string;
  knowledgeContentPlaceholder: string;
  knowledgeNewTagPlaceholder: string;
  knowledgeCategoryPlaceholder: string;
  knowledgeNoTitle: string;
  knowledgePublicLink: string;
  knowledgeStatusPublicDesc: string;
  knowledgeStatusInternalDesc: string;
  knowledgeStatusDraftPublicDesc: string;
  knowledgeStatusDraftInternalDesc: string;
  knowledgeLinked: string;
  knowledgeAlreadyLinked: string;
  knowledgeLinkFailed: string;
  knowledgeUnlinkSuccess: string;
  knowledgeUnlinkFailed: string;
  knowledgeSearchError: string;
  knowledgeLinkSearchPlaceholder: string;
  knowledgeLinkSourceAgent: string;
  knowledgeLinkManual: string;
  // Templates
  templatesTitleContentRequired: string;
  templatesSaveError: string;
  templatesCreateSuccess: string;
  templatesDeleteSuccess: string;
  templatesDeleteError: string;
  templatesDeleteFailed: string;
  templatesCategoryPlaceholder: string;
  templatesRequestTypePlaceholder: string;
  templatesContentPlaceholder: string;
  templatesCreateButton: string;
  templatesUnknown: string;
  // Categories
  categoriesNameRequired: string;
  categoriesCreateSuccess: string;
  categoriesEditSuccess: string;
  categoriesError: string;
  categoriesDeleteSuccess: string;
  categoriesDeleteError: string;
  categoriesNamePlaceholder: string;
  categoriesDescriptionPlaceholder: string;
  categoriesEditTitle: string;
  categoriesNewTitle: string;
  categoriesSlugAutoGenerated: string;
  categoriesSlugReadonly: string;
  // Audit logs
  auditLogsActorPlaceholder: string;
  auditLogsActionPlaceholder: string;
  auditLogsResourcePlaceholder: string;
  auditLogsDateFromPlaceholder: string;
  auditLogsDateToPlaceholder: string;
  auditLogsAiDescription: string;
  // Business hours additions
  businessHoursDayLabels: string; // not needed - use array pattern below
  businessHoursSaveSuccess: string;
  businessHoursSaveFailed: string;
  businessHoursLoadFailed: string;
  businessHoursWorkDayRequired: string;
  businessHoursHolidayRequired: string;
  businessHoursTimezoneSeoul: string;
  businessHoursTimezoneTokyo: string;
  businessHoursTimezoneShanghai: string;
  businessHoursTimezoneSingapore: string;
  businessHoursTimezoneLondon: string;
  businessHoursTimezoneParis: string;
  businessHoursTimezoneNewYork: string;
  businessHoursTimezoneLosAngeles: string;
  // Branding
  brandingUploadFailed: string;
  brandingSaveSuccess: string;
  brandingSaveFailed: string;
  brandingCompanyPlaceholder: string;
  brandingDescPlaceholder: string;
  brandingAppTitlePlaceholder: string;
  brandingAdminTitlePlaceholder: string;
  brandingSave: string;
  // System management
  systemBackupDownload: string;
  systemBackupSuccess: string;
  systemBackupFailed: string;
  systemRestoreStart: string;
  systemRestoreSuccess: string;
  systemRestoreSchemaWarning: string;
  systemRestoreError: string;
  systemResetConfirmPlaceholder: string;
  systemResetButton: string;
  systemResetSuccess: string;
  systemResetFailed: string;
  systemDataTickets: string;
  systemDataAgents: string;
  systemDataSettings: string;
  systemDataKnowledge: string;
  systemDataAuditLogs: string;
  // Email settings
  emailSaveSuccess: string;
  emailSaveFailed: string;
  emailPasswordPlaceholder: string;
  emailSecretPlaceholder: string;
  emailSaveButton: string;
  // LLM settings
  llmSaveButton: string;
  llmOllamaSuccess: string;
  llmOllamaFailed: string;
  // Git settings
  gitConnected: string;
  gitDisconnected: string;
  gitProviderTokenRequired: string;
  gitSaveSuccess: string;
  gitSaveFailed: string;
  gitSaveError: string;
  gitDeleteFailed: string;
  gitDeleteSuccess: string;
  gitDeleteError: string;
  gitRepoScopeNote: string;
  // API keys
  gitApiKeyLastUsed: string;
  apiKeyNameAriaLabel: string;
  // Webhooks
  webhookEventTicketCreated: string;
  webhookEventTicketUpdated: string;
  webhookEventTicketCommented: string;
  webhookTestSuccess: string;
  webhookTestFailed: string;
  webhookTestSending: string;
  webhookLastTriggered: string;
  webhookResponseCode: string;
  webhookNone: string;
  // Request types
  requestTypeSaveSuccess: string;
  requestTypeUpdateSuccess: string;
  requestTypeStatusFailed: string;
  requestTypeDeleteFailed: string;
  requestTypeDeleteSuccess: string;
  requestTypeError: string;
  requestTypeDescriptionPlaceholder: string;
  requestTypeTeamPlaceholder: string;
  requestTypeInactive: string;
  requestTypeCreateButton: string;
  requestTypeSaveButton: string;
  // Custom fields
  customFieldKeyRequired: string;
  customFieldKeyInvalid: string;
  customFieldNameRequired: string;
  customFieldOptionsRequired: string;
  customFieldEditTitle: string;
  customFieldNewTitle: string;
  customFieldSaveSuccess: string;
  customFieldSaveError: string;
  customFieldActivateSuccess: string;
  customFieldDeactivateSuccess: string;
  customFieldStatusError: string;
  customFieldDeleteSuccess: string;
  customFieldDeleteError: string;
  customFieldTypeText: string;
  customFieldTypeNumber: string;
  customFieldTypeDate: string;
  customFieldTypeBoolean: string;
  customFieldTypeSelect: string;
  customFieldTypeMultiSelect: string;
  customFieldNamePlaceholder: string;
  customFieldDescriptionPlaceholder: string;
  customFieldOptionPlaceholder: string;
  customFieldKeyExamplePlaceholder: string;
  // SLA
  slaPolicyActive: string;
  slaPolicyInactive: string;
  slaPolicyRunning: string;
  slaPolicyStopped: string;
  slaPolicyNoDescription: string;
  slaPolicyActivateSuccess: string;
  slaPolicyDeactivateSuccess: string;
  slaPolicyStatusError: string;
  slaPolicyDeleteConfirm: string;
  slaPolicyPriority: string;
  slaPolicyFirstResponse: string;
  slaPolicyResolution: string;
  slaPolicySaving: string;
  // Automation rules
  automationLoadFailed: string;
  automationSaveFailed: string;
  automationCreateSuccess: string;
  automationActivateSuccess: string;
  automationStatusFailed: string;
  automationDeleteConfirm: string;
  automationDeleteSuccess: string;
  automationDeleteFailed: string;
  automationNoDescription: string;
  automationConditions: string;
  automationActions: string;
  automationUnassign: string;
  automationRuleNameAriaLabel: string;
  automationDescriptionAriaLabel: string;
  automationTriggerAriaLabel: string;
  automationPriorityAriaLabel: string;
  automationCondStatusAriaLabel: string;
  automationCondPriorityAriaLabel: string;
  automationCondEmailAriaLabel: string;
  automationCondKeywordAriaLabel: string;
  automationCondAgeAriaLabel: string;
  automationCondUpdateAgeAriaLabel: string;
  automationActStatusAriaLabel: string;
  automationActPriorityAriaLabel: string;
  automationActAssigneeAriaLabel: string;
  automationActTeamAriaLabel: string;
  automationActTagAriaLabel: string;
  // SAML
  samlMetaDownloadSuccess: string;
  samlMetaDownloadFailed: string;
  // Chat widget
  chatWidgetSaveSuccess: string;
  chatWidgetSaveFailed: string;
  chatWidgetLoadFailed: string;
  chatWidgetFloatingEnable: string;
  chatWidgetBadgeShow: string;
  chatWidgetBadgeColor: string;
  chatWidgetBadgePosition: string;
  chatWidgetBadgeFixed: string;
  chatWidgetButtonSize: string;
  chatWidgetButtonShape: string;
  chatWidgetButtonShadow: string;
  chatWidgetButtonImageUrl: string;
  chatWidgetButtonImageUpload: string;
  chatWidgetButtonImageSuccess: string;
  chatWidgetButtonImageFailed: string;
  chatWidgetBorderThickness: string;
  chatWidgetBorderColor: string;
  chatWidgetPointColor: string;
  chatWidgetHoverEffect: string;
  chatWidgetLauncherPosition: string;
  // Chat profile manager
  chatProfileAdd: string;
  chatProfileName: string;
  chatProfileWelcomeTitle: string;
  chatProfileWelcomeMessage: string;
  chatProfileButtonLabel: string;
  chatProfileImageFit: string;
  chatProfileBadgeShow: string;
  chatProfileBadgeColor: string;
  chatProfileBadgePosition: string;
  chatProfileBadgeFixed: string;
  chatProfileButtonSize: string;
  chatProfileButtonShape: string;
  chatProfileButtonShadow: string;
  chatProfileButtonImageUrl: string;
  chatProfileButtonImageUpload: string;
  chatProfileButtonImageSuccess: string;
  chatProfileButtonImageFailed: string;
  chatProfileBorderThickness: string;
  chatProfileBorderColor: string;
  chatProfilePointColor: string;
  chatProfileHoverEffect: string;
  // Chat saved views
  chatViewName: string;
  chatViewSaveSuccess: string;
  chatViewSaveFailed: string;
  chatViewDeleteSuccess: string;
  chatViewDeleteFailed: string;
  chatViewNameRequired: string;
  chatStatusUpdateFailed: string;
  chatFilterSla: string;
  chatFilterAssignee: string;
  chatFilterStatus: string;
  chatBrandSupport: string;
  chatOnlineSupport: string;
  // Ticket form (admin/ticket/ticket-form.tsx)
  ticketFormCreateFailed: string;
  ticketFormUnknownError: string;
  ticketFormSubmit: string;
  ticketFormSubjectPlaceholder: string;
  ticketFormBodyPlaceholder: string;
  ticketFormOrgPlaceholder: string;
  // Comment list (admin/ticket/comment-list.tsx)
  commentAuthorCustomer: string;
  commentAuthorAgent: string;
  commentRoleCustomer: string;
  commentRoleAgent: string;
  // Customer reply form (admin/ticket/customer-reply-form.tsx)
  customerReplyFailed: string;
  customerReplyError: string;
  customerReplyPlaceholder: string;
  // Git integration section (admin/ticket/git-integration-section.tsx)
  gitIssueLinkFailed: string;
  gitIssueUnlinkFailed: string;
  gitIssueUnlinkSuccess: string;
  gitIssueSearchFailed: string;
  gitIssueSearchError: string;
  gitIssueCreateFailed: string;
  gitIssueCreateError: string;
  gitIssueSearchPlaceholder: string;
  gitIssueSearchButton: string;
  gitIssueSearchLoading: string;
  gitIssueCreateButton: string;
  gitIssueCreateLoading: string;
  // Helpdesk operations center
  helpdeskSlaTitle: string;
  helpdeskSlaDescription: string;
  helpdeskAutoTitle: string;
  helpdeskAutoDescription: string;
  helpdeskShortcutsTitle: string;
  helpdeskShortcutsDescription: string;
  // Saved filters
  savedFilterNameRequired: string;
  savedFilterSaveSuccess: string;
  savedFilterSaveError: string;
  savedFilterDeleteSuccess: string;
  savedFilterDeleteError: string;
  savedFilterNamePlaceholder: string;
  savedFilterSaving: string;
  // Advanced search
  advancedSearchPlaceholder: string;
  advancedSearchAll: string;
  advancedSearchAny: string;
  advancedSearchExact: string;
  // Ticket knowledge links
  ticketKnowledgeSearchError: string;
  ticketKnowledgeLinkSuccess: string;
  ticketKnowledgeAlreadyLinked: string;
  ticketKnowledgeLinkFailed: string;
  ticketKnowledgeUnlinkSuccess: string;
  ticketKnowledgeUnlinkFailed: string;
  ticketKnowledgeSearchPlaceholder: string;
  ticketKnowledgeSourceAgent: string;
  ticketKnowledgeSourceManual: string;
  // Analytics
  analyticsHighUsage: string;
  analyticsTotalTickets: string;
  analyticsOpenTickets: string;
  analyticsRecentInquiries: string;
  analyticsAverageRating: string;
  analyticsCoachingPrompt: string;
```

- [ ] **Step 2: Add Korean values for all new keys in the `ko` dictionary**

In the `ADMIN_COPY.ko` object, add after `daySaturday`:

```typescript
    // Nav section titles
    sectionSettings: "설정",
    sectionTools: "도구",
    sectionLogs: "로그",
    navAnalytics: "분석 및 리포트",
    navChats: "실시간 채팅",
    settingsChatSettings: "채팅 설정",
    settingsIntegrations: "연동 설정",
    // Common additions
    commonAll: "전체",
    commonUnknown: "알 수 없음",
    commonSystem: "시스템",
    commonActive: "활성",
    commonInactive: "비활성",
    commonDeactivate: "비활성화",
    commonAdd: "추가",
    commonApply: "적용",
    commonClose: "닫기",
    commonConfirm: "확인",
    commonSearch: "검색",
    commonSaveSettings: "설정 저장",
    commonPublish: "게시하기",
    commonSaveDraft: "초안 저장",
    commonUploadClick: "클릭하여 업로드",
    commonSendTest: "테스트 발송",
    commonSend: "전송",
    commonSending: "전송 중...",
    commonSaving: "저장 중...",
    commonProcessing: "처리 중...",
    commonSearching: "검색 중...",
    commonCreating: "생성 중...",
    commonDeleting: "삭제 중...",
    commonConnected: "연결됨",
    commonDisconnected: "미연결",
    commonUnassigned: "미할당",
    commonNone: "없음",
    commonNoDescription: "설명 없음",
    // Ticket status short labels
    ticketStatusOpen: "열림",
    ticketStatusInProgress: "진행중",
    ticketStatusWaiting: "대기중",
    ticketStatusResolved: "해결됨",
    ticketStatusClosed: "닫힘",
    // Ticket filter/list
    ticketsSearchPlaceholder: "티켓 번호, 제목, 이메일 검색...",
    ticketsFilterStatus: "상태",
    ticketsFilterPriority: "우선순위",
    ticketsFilterRequestType: "문의 유형",
    ticketsFilterAssignee: "담당자",
    ticketsDateFrom: "시작일",
    ticketsDateTo: "종료일",
    ticketsBulkStatus: "상태 변경",
    ticketsBulkPriority: "우선순위 변경",
    ticketsBulkAssignee: "담당자 변경",
    ticketsBulkApply: "벌크 적용",
    ticketsSelectAll: "전체 선택",
    ticketsBulkSelectRequired: "일괄 변경할 항목을 선택해주세요.",
    ticketsBulkSuccess: "일괄 변경이 완료되었습니다.",
    ticketsBulkFailed: "일괄 변경에 실패했습니다.",
    // Ticket detail
    ticketDetailUnauthorized: "권한이 없습니다.",
    ticketDetailUpdateSuccess: "업데이트 되었습니다.",
    ticketDetailUpdateFailed: "업데이트 중 오류가 발생했습니다.",
    ticketDetailUnassigned: "미할당",
    ticketDetailActorSystem: "시스템",
    ticketDetailSourceTicket: "원본 티켓",
    ticketDetailTargetTicket: "대상 티켓",
    ticketDetailCurrentStatus: "현재 상태",
    ticketDetailCanEdit: "바로 처리 가능",
    ticketDetailReadOnly: "읽기 전용 모드",
    ticketDetailCanEditDesc: "응답 작성과 내부 메모 등록을 바로 진행할 수 있습니다.",
    ticketDetailReadOnlyDesc: "담당자이거나 관리자일 때 응답과 내부 메모를 남길 수 있습니다.",
    // Ticket merge / transfer
    ticketMergeSelectRequired: "병합할 티켓을 선택해주세요.",
    ticketMergeConflict: "병합에 문제가 있습니다. 충돌을 확인해주세요.",
    ticketMergeSuccess: "티켓이 병합되었습니다.",
    ticketMergeFailed: "병합 중 오류가 발생했습니다.",
    ticketMergeReasonPlaceholder: "병합 이유를 입력해주세요...",
    ticketMergeValidate: "검증",
    ticketMergeFieldAssignee: "담당자",
    ticketMergeFieldTeam: "팀",
    ticketMergeFieldStatus: "상태",
    ticketTransferLabel: "양도",
    ticketTransferSelectRequired: "양도할 상담원을 선택해주세요",
    ticketTransferFailed: "양도 처리에 실패했습니다",
    ticketTransferError: "양도 처리 중 오류가 발생했습니다",
    ticketTransferReasonPlaceholder: "양도 사유를 입력하세요",
    ticketTransferSubmitting: "처리 중...",
    // Comment / internal note
    commentContentRequired: "내용을 입력해주세요",
    commentUpdateSuccess: "댓글이 수정되었습니다",
    commentUpdateFailed: "수정에 실패했습니다",
    commentDeleteSuccess: "댓글이 삭제되었습니다",
    commentDeleteFailed: "삭제에 실패했습니다",
    commentUpdateError: "수정에 실패했습니다",
    commentDeleteError: "삭제에 실패했습니다",
    commentResponsePlaceholder: "응답을 입력하세요...",
    commentLockedPlaceholder: "다른 상담원이 편집 중입니다...",
    commentWriteAriaLabel: "응답 작성",
    commentInternalNoteAriaLabel: "내부 메모로 저장",
    commentAiSuggest: "AI 답변 제안",
    commentAiSuggestLoading: "생성 중...",
    internalNoteContentRequired: "내용을 입력해주세요.",
    internalNoteFailed: "응답 등록 실패",
    internalNoteError: "응답 등록 중 오류가 발생했습니다.",
    internalNoteSubmitting: "전송 중...",
    internalNoteSuccess: "내부 메모가 등록되었습니다.",
    internalNoteResponseSuccess: "응답이 등록되었습니다.",
    internalNotePlaceholder: "응답 또는 내부 메모를 작성하세요...",
    // Agent management
    agentsSearchPlaceholder: "이름 또는 이메일로 검색...",
    agentsNameEmailRequired: "이름과 이메일을 입력해주세요",
    agentsAddFailed: "상담원 추가에 실패했습니다",
    agentsAddSuccess: "상담원이 추가되었습니다",
    agentsAddError: "상담원 추가 중 오류가 발생했습니다",
    agentsEditFailed: "상담원 수정에 실패했습니다",
    agentsEditSuccess: "상담원 정보가 수정되었습니다",
    agentsEditError: "상담원 수정 중 오류가 발생했습니다",
    agentsDeactivateFailed: "비활성화에 실패했습니다",
    agentsDeactivateSuccess: "상담원이 비활성화되었습니다",
    agentsDeactivateError: "비활성화 처리 중 오류가 발생했습니다",
    agentsDeleteFailed: "삭제에 실패했습니다",
    agentsDeleteSuccess: "상담원이 삭제되었습니다",
    agentsDeleteError: "삭제 처리 중 오류가 발생했습니다",
    agentsPasswordResetFailed: "비밀번호 초기화에 실패했습니다",
    agentsPasswordResetError: "비밀번호 초기화 중 오류가 발생했습니다",
    agentsPhonePlaceholder: "010-0000-0000",
    agentsTeamLeadPlaceholder: "팀장으로 지정할 팀 선택",
    // Team management
    teamsDescriptionPlaceholder: "팀에 대한 설명",
    teamsCreateSuccess: "팀이 생성되었습니다",
    teamsCreateError: "오류가 발생했습니다",
    teamsStatusFailed: "상태 변경에 실패했습니다",
    teamsStatusError: "상태 변경에 실패했습니다",
    teamsDeactivateSuccess: "비활성화되었습니다",
    teamsDeactivateError: "오류가 발생했습니다",
    // Customer
    customersSearchPlaceholder: "이름 또는 이메일로 검색...",
    customersNoHistory: "문의 내역 없음",
    customersOpenTickets: "오픈 티켓",
    customersTotalTickets: "총 문의",
    customersCsat: "고객 만족도",
    customersRecentInquiry: "최근 문의",
    // Knowledge
    knowledgeTitleRequired: "제목을 입력해주세요",
    knowledgeSlugRequired: "슬러그를 입력해주세요",
    knowledgeContentRequired: "내용을 입력해주세요",
    knowledgeCategoryRequired: "카테고리를 선택해주세요",
    knowledgeSaveSuccess: "문서가 저장되었습니다",
    knowledgeSaveError: "저장 중 오류가 발생했습니다",
    knowledgeDeleteSuccess: "문서가 삭제되었습니다",
    knowledgeDeleteError: "삭제 중 오류가 발생했습니다",
    knowledgeSearchPlaceholder: "문서 검색...",
    knowledgeTitlePlaceholder: "문서 제목을 입력하세요",
    knowledgeSummaryPlaceholder: "문서 내용을 간략히 요약해주세요 (선택사항)",
    knowledgeContentPlaceholder: "마크다운 형식으로 내용을 작성하세요...",
    knowledgeNewTagPlaceholder: "새 태그 입력",
    knowledgeCategoryPlaceholder: "카테고리 선택",
    knowledgeNoTitle: "제목 없음",
    knowledgePublicLink: "공개 링크",
    knowledgeStatusPublicDesc: "현재 게시된 공개 문서입니다. 고객 포털에서 공개 링크로 접근할 수 있습니다.",
    knowledgeStatusInternalDesc: "현재 게시된 내부 문서입니다. 상담원/관리자용으로만 유지되며 고객 포털에는 노출되지 않습니다.",
    knowledgeStatusDraftPublicDesc: "현재 초안 상태입니다. 게시하면 고객 포털에서 공개 링크로 접근할 수 있습니다.",
    knowledgeStatusDraftInternalDesc: "현재 초안 상태의 내부 문서입니다. 게시 전까지 고객 포털에는 노출되지 않습니다.",
    knowledgeLinked: "문서가 연결되었습니다.",
    knowledgeAlreadyLinked: "이미 연결된 문서입니다.",
    knowledgeLinkFailed: "연결 중 오류가 발생했습니다.",
    knowledgeUnlinkSuccess: "연결이 해제되었습니다.",
    knowledgeUnlinkFailed: "연결 해제 중 오류가 발생했습니다.",
    knowledgeSearchError: "검색 중 오류가 발생했습니다.",
    knowledgeLinkSearchPlaceholder: "지식 문서 검색...",
    knowledgeLinkSourceAgent: "상담원 삽입",
    knowledgeLinkManual: "수동 연결",
    // Templates
    templatesTitleContentRequired: "제목과 내용을 입력해주세요.",
    templatesSaveError: "저장 중 오류가 발생했습니다.",
    templatesCreateSuccess: "템플릿이 생성되었습니다.",
    templatesDeleteSuccess: "템플릿이 삭제되었습니다.",
    templatesDeleteError: "삭제 중 오류가 발생했습니다.",
    templatesDeleteFailed: "삭제에 실패했습니다.",
    templatesCategoryPlaceholder: "카테고리 선택",
    templatesRequestTypePlaceholder: "문의 유형 선택",
    templatesContentPlaceholder: "템플릿 내용을 입력하세요. 변수를 사용하려면 위의 버튼을 클릭하세요.",
    templatesCreateButton: "생성하기",
    templatesUnknown: "알 수 없음",
    // Categories
    categoriesNameRequired: "카테고리 이름을 입력하세요",
    categoriesCreateSuccess: "카테고리가 생성되었습니다",
    categoriesEditSuccess: "카테고리가 수정되었습니다",
    categoriesError: "오류가 발생했습니다",
    categoriesDeleteSuccess: "카테고리가 삭제되었습니다",
    categoriesDeleteError: "오류가 발생했습니다",
    categoriesNamePlaceholder: "카테고리 이름",
    categoriesDescriptionPlaceholder: "카테고리 설명",
    categoriesEditTitle: "카테고리 수정",
    categoriesNewTitle: "새 카테고리",
    categoriesSlugAutoGenerated: "자동으로 생성됩니다 (수정 가능)",
    categoriesSlugReadonly: "슬러그는 수정할 수 없습니다",
    // Audit logs
    auditLogsActorPlaceholder: "작업자 이름/이메일 검색",
    auditLogsActionPlaceholder: "작업 유형",
    auditLogsResourcePlaceholder: "리소스 유형",
    auditLogsDateFromPlaceholder: "시작일",
    auditLogsDateToPlaceholder: "종료일",
    auditLogsAiDescription: "현재 필터 조건의 감사 로그에서 비정상 패턴을 AI가 탐지합니다.",
    // Business hours additions
    businessHoursSaveSuccess: "영업시간 설정이 저장되었습니다.",
    businessHoursSaveFailed: "저장에 실패했습니다. 다시 시도해 주세요.",
    businessHoursLoadFailed: "설정을 불러오지 못했습니다.",
    businessHoursWorkDayRequired: "최소 하나 이상의 근무일을 선택해 주세요.",
    businessHoursHolidayRequired: "휴일 이름과 날짜를 입력해 주세요.",
    businessHoursTimezoneSeoul: "서울 (UTC+9)",
    businessHoursTimezoneTokyo: "도쿄 (UTC+9)",
    businessHoursTimezoneShanghai: "상하이 (UTC+8)",
    businessHoursTimezoneSingapore: "싱가포르 (UTC+8)",
    businessHoursTimezoneLondon: "런던 (UTC+0/+1)",
    businessHoursTimezoneParis: "파리 (UTC+1/+2)",
    businessHoursTimezoneNewYork: "뉴욕 (UTC-5/-4)",
    businessHoursTimezoneLosAngeles: "로스앤젤레스 (UTC-8/-7)",
    // Branding
    brandingUploadFailed: "파일 업로드에 실패했습니다.",
    brandingSaveSuccess: "브랜딩 설정이 저장되었습니다.",
    brandingSaveFailed: "브랜딩 설정 저장에 실패했습니다.",
    brandingCompanyPlaceholder: "회사명을 입력하세요",
    brandingDescPlaceholder: "민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다.",
    brandingAppTitlePlaceholder: "고객 지원 센터",
    brandingAdminTitlePlaceholder: "무엇을 도와드릴까요?",
    brandingSave: "설정 저장",
    // System management
    systemBackupDownload: "백업 다운로드",
    systemBackupSuccess: "백업 파일이 다운로드되었습니다.",
    systemBackupFailed: "백업 실패",
    systemRestoreStart: "복구 시작",
    systemRestoreSuccess: "복구가 완료되었습니다. 로그인 화면으로 이동합니다.",
    systemRestoreSchemaWarning: "스키마 버전이 다릅니다. 복구는 완료되었지만 일부 데이터에 문제가 있을 수 있습니다.",
    systemRestoreError: "복구 실패",
    systemResetConfirmPlaceholder: "초기화",
    systemResetButton: "초기화",
    systemResetSuccess: "초기화가 완료되었습니다.",
    systemResetFailed: "초기화 실패",
    systemDataTickets: "티켓 및 고객 데이터",
    systemDataAgents: "상담원 계정",
    systemDataSettings: "설정",
    systemDataKnowledge: "지식 베이스",
    systemDataAuditLogs: "감사 로그",
    // Email settings
    emailSaveSuccess: "이메일 설정이 저장되었습니다.",
    emailSaveFailed: "이메일 설정 저장에 실패했습니다.",
    emailPasswordPlaceholder: "비밀번호 입력",
    emailSecretPlaceholder: "Secret Key 입력",
    emailSaveButton: "설정 저장",
    // LLM settings
    llmSaveButton: "설정 저장",
    llmOllamaSuccess: "Ollama 서버가 응답했습니다.",
    llmOllamaFailed: "Ollama 서버에 접근할 수 없습니다.",
    // Git settings
    gitConnected: "연결됨",
    gitDisconnected: "미연결",
    gitProviderTokenRequired: "프로바이더와 토큰을 입력해주세요",
    gitSaveSuccess: "자격증명이 저장되었습니다",
    gitSaveFailed: "저장에 실패했습니다",
    gitSaveError: "오류가 발생했습니다",
    gitDeleteFailed: "삭제에 실패했습니다",
    gitDeleteSuccess: "자격증명이 삭제되었습니다",
    gitDeleteError: "삭제에 실패했습니다",
    gitRepoScopeNote: "프라이빗 리포지토리 접근을 위해 'repo' 스코프가 필요합니다.",
    gitApiKeyLastUsed: "마지막 사용",
    apiKeyNameAriaLabel: "키 이름",
    // Webhooks
    webhookEventTicketCreated: "티켓 생성",
    webhookEventTicketUpdated: "티켓 수정",
    webhookEventTicketCommented: "댓글 등록",
    webhookTestSuccess: "테스트 webhook을 발송했습니다.",
    webhookTestFailed: "테스트 webhook 발송에 실패했습니다.",
    webhookTestSending: "전송 중...",
    webhookLastTriggered: "마지막 호출",
    webhookResponseCode: "응답 코드",
    webhookNone: "없음",
    // Request types
    requestTypeSaveSuccess: "수정되었습니다",
    requestTypeUpdateSuccess: "생성되었습니다",
    requestTypeStatusFailed: "상태 변경에 실패했습니다",
    requestTypeDeleteFailed: "삭제에 실패했습니다",
    requestTypeDeleteSuccess: "삭제되었습니다",
    requestTypeError: "오류가 발생했습니다",
    requestTypeDescriptionPlaceholder: "문의 유형에 대한 설명",
    requestTypeTeamPlaceholder: "팀 선택",
    requestTypeInactive: "아니오",
    requestTypeCreateButton: "생성",
    requestTypeSaveButton: "저장",
    // Custom fields
    customFieldKeyRequired: "키는 필수입니다.",
    customFieldKeyInvalid: "키는 영문, 숫자, 언더스코어만 사용 가능합니다.",
    customFieldNameRequired: "이름은 필수입니다.",
    customFieldOptionsRequired: "옵션은 필수입니다.",
    customFieldEditTitle: "커스텀 필드 수정",
    customFieldNewTitle: "새 커스텀 필드",
    customFieldSaveSuccess: "필드가 생성되었습니다.",
    customFieldSaveError: "저장 중 오류가 발생했습니다.",
    customFieldActivateSuccess: "필드가 활성화되었습니다.",
    customFieldDeactivateSuccess: "필드가 비활성화되었습니다.",
    customFieldStatusError: "상태 변경 중 오류가 발생했습니다.",
    customFieldDeleteSuccess: "필드가 삭제되었습니다.",
    customFieldDeleteError: "삭제 중 오류가 발생했습니다.",
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
    // SLA
    slaPolicyActive: "활성",
    slaPolicyInactive: "비활성",
    slaPolicyRunning: "운영중",
    slaPolicyStopped: "중지됨",
    slaPolicyNoDescription: "설명 없음",
    slaPolicyActivateSuccess: "정책이 활성화되었습니다.",
    slaPolicyDeactivateSuccess: "정책이 비활성화되었습니다.",
    slaPolicyStatusError: "오류가 발생했습니다.",
    slaPolicyDeleteConfirm: "이 SLA 정책을 삭제하시겠습니까?",
    slaPolicyPriority: "우선순위",
    slaPolicyFirstResponse: "첫 응답",
    slaPolicyResolution: "해결 목표",
    slaPolicySaving: "저장 중...",
    // Automation rules
    automationLoadFailed: "자동화 규칙을 불러오지 못했습니다.",
    automationSaveFailed: "자동화 규칙 저장에 실패했습니다.",
    automationCreateSuccess: "자동화 규칙이 생성되었습니다.",
    automationActivateSuccess: "규칙이 활성화되었습니다.",
    automationStatusFailed: "자동화 규칙 상태 변경에 실패했습니다.",
    automationDeleteConfirm: "이 자동화 규칙을 삭제하시겠습니까?",
    automationDeleteSuccess: "자동화 규칙이 삭제되었습니다.",
    automationDeleteFailed: "자동화 규칙 삭제에 실패했습니다.",
    automationNoDescription: "설명 없음",
    automationConditions: "조건",
    automationActions: "동작",
    automationUnassign: "담당자 해제",
    automationRuleNameAriaLabel: "규칙 이름",
    automationDescriptionAriaLabel: "설명",
    automationTriggerAriaLabel: "트리거",
    automationPriorityAriaLabel: "실행 우선순위",
    automationCondStatusAriaLabel: "조건 상태",
    automationCondPriorityAriaLabel: "조건 우선순위",
    automationCondEmailAriaLabel: "고객 이메일 조건",
    automationCondKeywordAriaLabel: "키워드 조건",
    automationCondAgeAriaLabel: "생성 후 경과 시간(시간)",
    automationCondUpdateAgeAriaLabel: "업데이트 후 경과 시간(시간)",
    automationActStatusAriaLabel: "상태 변경",
    automationActPriorityAriaLabel: "우선순위 변경",
    automationActAssigneeAriaLabel: "담당자 재배정",
    automationActTeamAriaLabel: "팀 재지정",
    automationActTagAriaLabel: "추가 태그",
    // SAML
    samlMetaDownloadSuccess: "메타데이터 파일이 다운로드되었습니다",
    samlMetaDownloadFailed: "메타데이터 파일 다운로드에 실패했습니다",
    // Chat widget
    chatWidgetSaveSuccess: "채팅 위젯 설정이 저장되었습니다.",
    chatWidgetSaveFailed: "채팅 위젯 설정 저장에 실패했습니다.",
    chatWidgetLoadFailed: "채팅 위젯 설정을 불러오지 못했습니다.",
    chatWidgetFloatingEnable: "플로팅 채팅 버튼 활성화",
    chatWidgetBadgeShow: "미읽음 배지 표시",
    chatWidgetBadgeColor: "배지 색상",
    chatWidgetBadgePosition: "배지 위치",
    chatWidgetBadgeFixed: "고정 배지 텍스트",
    chatWidgetButtonSize: "버튼 크기",
    chatWidgetButtonShape: "버튼 모양",
    chatWidgetButtonShadow: "버튼 그림자",
    chatWidgetButtonImageUrl: "버튼 이미지 URL",
    chatWidgetButtonImageUpload: "버튼 이미지 업로드",
    chatWidgetButtonImageSuccess: "버튼 이미지를 업로드했습니다.",
    chatWidgetButtonImageFailed: "버튼 이미지 업로드에 실패했습니다.",
    chatWidgetBorderThickness: "테두리 두께",
    chatWidgetBorderColor: "테두리 색상",
    chatWidgetPointColor: "포인트 컬러",
    chatWidgetHoverEffect: "호버 효과",
    chatWidgetLauncherPosition: "런처 위치",
    // Chat profile manager
    chatProfileAdd: "프로필 추가",
    chatProfileName: "프로필 이름",
    chatProfileWelcomeTitle: "프로필 환영 제목",
    chatProfileWelcomeMessage: "프로필 환영 메시지",
    chatProfileButtonLabel: "프로필 버튼 라벨",
    chatProfileImageFit: "프로필 이미지 맞춤 방식",
    chatProfileBadgeShow: "프로필 미읽음 배지 표시",
    chatProfileBadgeColor: "프로필 배지 색상",
    chatProfileBadgePosition: "프로필 배지 위치",
    chatProfileBadgeFixed: "프로필 고정 배지 텍스트",
    chatProfileButtonSize: "프로필 버튼 크기",
    chatProfileButtonShape: "프로필 버튼 모양",
    chatProfileButtonShadow: "프로필 버튼 그림자",
    chatProfileButtonImageUrl: "프로필 버튼 이미지 URL",
    chatProfileButtonImageUpload: "프로필 버튼 이미지 업로드",
    chatProfileButtonImageSuccess: "프로필 버튼 이미지를 업로드했습니다.",
    chatProfileButtonImageFailed: "프로필 버튼 이미지 업로드에 실패했습니다.",
    chatProfileBorderThickness: "프로필 테두리 두께",
    chatProfileBorderColor: "프로필 테두리 색상",
    chatProfilePointColor: "프로필 포인트 컬러",
    chatProfileHoverEffect: "프로필 호버 효과",
    // Chat saved views
    chatViewName: "채팅 보기 이름",
    chatViewSaveSuccess: "채팅 보기가 저장되었습니다.",
    chatViewSaveFailed: "채팅 보기 저장에 실패했습니다.",
    chatViewDeleteSuccess: "채팅 보기가 삭제되었습니다.",
    chatViewDeleteFailed: "채팅 보기 삭제에 실패했습니다.",
    chatViewNameRequired: "보기 이름을 입력해주세요.",
    chatStatusUpdateFailed: "채팅 상태 업데이트에 실패했습니다.",
    chatFilterSla: "채팅 SLA 필터",
    chatFilterAssignee: "채팅 담당자 필터",
    chatFilterStatus: "채팅 상태 필터",
    chatBrandSupport: "브랜드 상담",
    chatOnlineSupport: "채팅 상담",
    // Ticket form
    ticketFormCreateFailed: "티켓 생성에 실패했습니다.",
    ticketFormUnknownError: "알 수 없는 오류가 발생했습니다.",
    ticketFormSubmit: "티켓 제출",
    ticketFormSubjectPlaceholder: "문의 제목을 입력해주세요",
    ticketFormBodyPlaceholder: "문의 내용을 상세히 입력해주세요 (최소 20자)",
    ticketFormOrgPlaceholder: "회사명 또는 소속 기관",
    // Comment list
    commentAuthorCustomer: "고객",
    commentAuthorAgent: "상담원",
    commentRoleCustomer: "작성자",
    commentRoleAgent: "상담원",
    // Customer reply form
    customerReplyFailed: "답변 등록에 실패했습니다.",
    customerReplyError: "오류가 발생했습니다. 다시 시도해주세요.",
    customerReplyPlaceholder: "추가로 문의하실 내용을 입력해주세요.",
    // Git integration section
    gitIssueLinkFailed: "이슈 연결에 실패했습니다.",
    gitIssueUnlinkFailed: "연결 해제에 실패했습니다.",
    gitIssueUnlinkSuccess: "이슈 연결이 해제됐습니다.",
    gitIssueSearchFailed: "이슈 검색에 실패했습니다.",
    gitIssueSearchError: "이슈 검색에 실패했습니다.",
    gitIssueCreateFailed: "이슈 생성에 실패했습니다.",
    gitIssueCreateError: "이슈 생성에 실패했습니다.",
    gitIssueSearchPlaceholder: "이슈 검색어",
    gitIssueSearchButton: "이슈 검색",
    gitIssueSearchLoading: "검색 중...",
    gitIssueCreateButton: "새 이슈 생성",
    gitIssueCreateLoading: "생성 중...",
    // Helpdesk operations center
    helpdeskSlaTitle: "응답 목표",
    helpdeskSlaDescription: "문의별 응답/해결 목표 시간을 정해 서비스 기준을 맞춥니다.",
    helpdeskAutoTitle: "자동 처리",
    helpdeskAutoDescription: "반복되는 분류, 우선순위 변경, 재배정을 규칙으로 자동화합니다.",
    helpdeskShortcutsTitle: "작업 바로가기",
    helpdeskShortcutsDescription: "상담원이 자주 보는 작업 목록을 빠르게 열 수 있게 준비합니다.",
    // Saved filters
    savedFilterNameRequired: "필터 이름을 입력해주세요.",
    savedFilterSaveSuccess: "필터가 저장되었습니다.",
    savedFilterSaveError: "저장 중 오류가 발생했습니다.",
    savedFilterDeleteSuccess: "필터가 삭제되었습니다.",
    savedFilterDeleteError: "삭제 중 오류가 발생했습니다.",
    savedFilterNamePlaceholder: "필터 이름",
    savedFilterSaving: "저장 중...",
    // Advanced search
    advancedSearchPlaceholder: "검색어를 입력하세요...",
    advancedSearchAll: "모두",
    advancedSearchAny: "하나라도",
    advancedSearchExact: "정확",
    // Ticket knowledge links
    ticketKnowledgeSearchError: "검색 중 오류가 발생했습니다.",
    ticketKnowledgeLinkSuccess: "문서가 연결되었습니다.",
    ticketKnowledgeAlreadyLinked: "이미 연결된 문서입니다.",
    ticketKnowledgeLinkFailed: "연결 중 오류가 발생했습니다.",
    ticketKnowledgeUnlinkSuccess: "연결이 해제되었습니다.",
    ticketKnowledgeUnlinkFailed: "연결 해제 중 오류가 발생했습니다.",
    ticketKnowledgeSearchPlaceholder: "지식 문서 검색...",
    ticketKnowledgeSourceAgent: "상담원 삽입",
    ticketKnowledgeSourceManual: "수동 연결",
    // Analytics
    analyticsHighUsage: "높은 이용",
    analyticsTotalTickets: "총 티켓",
    analyticsOpenTickets: "오픈 티켓",
    analyticsRecentInquiries: "최근 문의",
    analyticsAverageRating: "평균 평점",
    analyticsCoachingPrompt: "최근 30일 상담원 성과를 분석하여 팀 코칭 포인트를 제안합니다.",
```

- [ ] **Step 3: Add English values for all new keys in the `en` dictionary**

In `ADMIN_COPY.en`, add after `daySaturday`:

```typescript
    // Nav section titles
    sectionSettings: "Settings",
    sectionTools: "Tools",
    sectionLogs: "Logs",
    navAnalytics: "Analytics & Reports",
    navChats: "Live Chats",
    settingsChatSettings: "Chat Settings",
    settingsIntegrations: "Integrations",
    // Common additions
    commonAll: "All",
    commonUnknown: "Unknown",
    commonSystem: "System",
    commonActive: "Active",
    commonInactive: "Inactive",
    commonDeactivate: "Deactivate",
    commonAdd: "Add",
    commonApply: "Apply",
    commonClose: "Close",
    commonConfirm: "Confirm",
    commonSearch: "Search",
    commonSaveSettings: "Save Settings",
    commonPublish: "Publish",
    commonSaveDraft: "Save Draft",
    commonUploadClick: "Click to upload",
    commonSendTest: "Send Test",
    commonSend: "Send",
    commonSending: "Sending...",
    commonSaving: "Saving...",
    commonProcessing: "Processing...",
    commonSearching: "Searching...",
    commonCreating: "Creating...",
    commonDeleting: "Deleting...",
    commonConnected: "Connected",
    commonDisconnected: "Not Connected",
    commonUnassigned: "Unassigned",
    commonNone: "None",
    commonNoDescription: "No description",
    // Ticket status short labels
    ticketStatusOpen: "Open",
    ticketStatusInProgress: "In Progress",
    ticketStatusWaiting: "Waiting",
    ticketStatusResolved: "Resolved",
    ticketStatusClosed: "Closed",
    // Ticket filter/list
    ticketsSearchPlaceholder: "Search by ticket #, subject, email...",
    ticketsFilterStatus: "Status",
    ticketsFilterPriority: "Priority",
    ticketsFilterRequestType: "Request Type",
    ticketsFilterAssignee: "Assignee",
    ticketsDateFrom: "From",
    ticketsDateTo: "To",
    ticketsBulkStatus: "Change Status",
    ticketsBulkPriority: "Change Priority",
    ticketsBulkAssignee: "Change Assignee",
    ticketsBulkApply: "Apply Bulk",
    ticketsSelectAll: "Select all",
    ticketsBulkSelectRequired: "Please select items to bulk update.",
    ticketsBulkSuccess: "Bulk update completed.",
    ticketsBulkFailed: "Bulk update failed.",
    // Ticket detail
    ticketDetailUnauthorized: "Unauthorized.",
    ticketDetailUpdateSuccess: "Updated successfully.",
    ticketDetailUpdateFailed: "Failed to update.",
    ticketDetailUnassigned: "Unassigned",
    ticketDetailActorSystem: "System",
    ticketDetailSourceTicket: "Source Ticket",
    ticketDetailTargetTicket: "Target Ticket",
    ticketDetailCurrentStatus: "Current Status",
    ticketDetailCanEdit: "Ready to Act",
    ticketDetailReadOnly: "Read-only Mode",
    ticketDetailCanEditDesc: "You can write responses and add internal notes.",
    ticketDetailReadOnlyDesc: "You can add responses and internal notes when you are the assignee or an admin.",
    // Ticket merge / transfer
    ticketMergeSelectRequired: "Please select a ticket to merge.",
    ticketMergeConflict: "Merge conflict detected. Please review.",
    ticketMergeSuccess: "Tickets merged successfully.",
    ticketMergeFailed: "Failed to merge tickets.",
    ticketMergeReasonPlaceholder: "Enter merge reason...",
    ticketMergeValidate: "Validate",
    ticketMergeFieldAssignee: "Assignee",
    ticketMergeFieldTeam: "Team",
    ticketMergeFieldStatus: "Status",
    ticketTransferLabel: "Transfer",
    ticketTransferSelectRequired: "Please select an agent to transfer to",
    ticketTransferFailed: "Transfer failed",
    ticketTransferError: "Error during transfer",
    ticketTransferReasonPlaceholder: "Enter transfer reason",
    ticketTransferSubmitting: "Processing...",
    // Comment / internal note
    commentContentRequired: "Please enter content",
    commentUpdateSuccess: "Comment updated",
    commentUpdateFailed: "Failed to update",
    commentDeleteSuccess: "Comment deleted",
    commentDeleteFailed: "Failed to delete",
    commentUpdateError: "Failed to update",
    commentDeleteError: "Failed to delete",
    commentResponsePlaceholder: "Enter your response...",
    commentLockedPlaceholder: "Another agent is editing...",
    commentWriteAriaLabel: "Write response",
    commentInternalNoteAriaLabel: "Save as internal note",
    commentAiSuggest: "AI Reply Suggestion",
    commentAiSuggestLoading: "Generating...",
    internalNoteContentRequired: "Please enter content.",
    internalNoteFailed: "Failed to submit",
    internalNoteError: "Error submitting response.",
    internalNoteSubmitting: "Sending...",
    internalNoteSuccess: "Internal note added.",
    internalNoteResponseSuccess: "Response submitted.",
    internalNotePlaceholder: "Write a response or internal note...",
    // Agent management
    agentsSearchPlaceholder: "Search by name or email...",
    agentsNameEmailRequired: "Name and email are required",
    agentsAddFailed: "Failed to add agent",
    agentsAddSuccess: "Agent added",
    agentsAddError: "Error adding agent",
    agentsEditFailed: "Failed to update agent",
    agentsEditSuccess: "Agent updated",
    agentsEditError: "Error updating agent",
    agentsDeactivateFailed: "Failed to deactivate",
    agentsDeactivateSuccess: "Agent deactivated",
    agentsDeactivateError: "Error deactivating agent",
    agentsDeleteFailed: "Failed to delete",
    agentsDeleteSuccess: "Agent deleted",
    agentsDeleteError: "Error deleting agent",
    agentsPasswordResetFailed: "Failed to reset password",
    agentsPasswordResetError: "Error resetting password",
    agentsPhonePlaceholder: "010-0000-0000",
    agentsTeamLeadPlaceholder: "Select team to lead",
    // Team management
    teamsDescriptionPlaceholder: "Team description",
    teamsCreateSuccess: "Team created",
    teamsCreateError: "An error occurred",
    teamsStatusFailed: "Failed to change status",
    teamsStatusError: "Failed to change status",
    teamsDeactivateSuccess: "Deactivated",
    teamsDeactivateError: "An error occurred",
    // Customer
    customersSearchPlaceholder: "Search by name or email...",
    customersNoHistory: "No inquiry history",
    customersOpenTickets: "Open Tickets",
    customersTotalTickets: "Total Inquiries",
    customersCsat: "CSAT",
    customersRecentInquiry: "Recent Inquiry",
    // Knowledge
    knowledgeTitleRequired: "Please enter a title",
    knowledgeSlugRequired: "Please enter a slug",
    knowledgeContentRequired: "Please enter content",
    knowledgeCategoryRequired: "Please select a category",
    knowledgeSaveSuccess: "Document saved",
    knowledgeSaveError: "Error saving document",
    knowledgeDeleteSuccess: "Document deleted",
    knowledgeDeleteError: "Error deleting document",
    knowledgeSearchPlaceholder: "Search documents...",
    knowledgeTitlePlaceholder: "Enter document title",
    knowledgeSummaryPlaceholder: "Brief summary (optional)",
    knowledgeContentPlaceholder: "Write content in Markdown format...",
    knowledgeNewTagPlaceholder: "Add new tag",
    knowledgeCategoryPlaceholder: "Select category",
    knowledgeNoTitle: "Untitled",
    knowledgePublicLink: "Public Link",
    knowledgeStatusPublicDesc: "Currently published as a public document. Accessible via public link in the customer portal.",
    knowledgeStatusInternalDesc: "Currently published as an internal document. For agents/admins only and not visible in the customer portal.",
    knowledgeStatusDraftPublicDesc: "Currently in draft. Once published, accessible via public link in the customer portal.",
    knowledgeStatusDraftInternalDesc: "Currently in draft as an internal document. Not visible in the customer portal until published.",
    knowledgeLinked: "Document linked.",
    knowledgeAlreadyLinked: "Already linked.",
    knowledgeLinkFailed: "Error linking document.",
    knowledgeUnlinkSuccess: "Document unlinked.",
    knowledgeUnlinkFailed: "Error unlinking document.",
    knowledgeSearchError: "Error searching documents.",
    knowledgeLinkSearchPlaceholder: "Search knowledge articles...",
    knowledgeLinkSourceAgent: "Agent Insert",
    knowledgeLinkManual: "Manual Link",
    // Templates
    templatesTitleContentRequired: "Title and content are required.",
    templatesSaveError: "Error saving template.",
    templatesCreateSuccess: "Template created.",
    templatesDeleteSuccess: "Template deleted.",
    templatesDeleteError: "Error deleting template.",
    templatesDeleteFailed: "Failed to delete template.",
    templatesCategoryPlaceholder: "Select category",
    templatesRequestTypePlaceholder: "Select request type",
    templatesContentPlaceholder: "Enter template content. Click the buttons above to insert variables.",
    templatesCreateButton: "Create",
    templatesUnknown: "Unknown",
    // Categories
    categoriesNameRequired: "Please enter a category name",
    categoriesCreateSuccess: "Category created",
    categoriesEditSuccess: "Category updated",
    categoriesError: "An error occurred",
    categoriesDeleteSuccess: "Category deleted",
    categoriesDeleteError: "An error occurred",
    categoriesNamePlaceholder: "Category name",
    categoriesDescriptionPlaceholder: "Category description",
    categoriesEditTitle: "Edit Category",
    categoriesNewTitle: "New Category",
    categoriesSlugAutoGenerated: "Auto-generated (editable)",
    categoriesSlugReadonly: "Slug cannot be changed",
    // Audit logs
    auditLogsActorPlaceholder: "Search by actor name/email",
    auditLogsActionPlaceholder: "Action type",
    auditLogsResourcePlaceholder: "Resource type",
    auditLogsDateFromPlaceholder: "From",
    auditLogsDateToPlaceholder: "To",
    auditLogsAiDescription: "AI detects anomalous patterns in audit logs matching current filters.",
    // Business hours additions
    businessHoursSaveSuccess: "Business hours saved.",
    businessHoursSaveFailed: "Failed to save. Please try again.",
    businessHoursLoadFailed: "Failed to load settings.",
    businessHoursWorkDayRequired: "Please select at least one work day.",
    businessHoursHolidayRequired: "Please enter a holiday name and date.",
    businessHoursTimezoneSeoul: "Seoul (UTC+9)",
    businessHoursTimezoneTokyo: "Tokyo (UTC+9)",
    businessHoursTimezoneShanghai: "Shanghai (UTC+8)",
    businessHoursTimezoneSingapore: "Singapore (UTC+8)",
    businessHoursTimezoneLondon: "London (UTC+0/+1)",
    businessHoursTimezoneParis: "Paris (UTC+1/+2)",
    businessHoursTimezoneNewYork: "New York (UTC-5/-4)",
    businessHoursTimezoneLosAngeles: "Los Angeles (UTC-8/-7)",
    // Branding
    brandingUploadFailed: "File upload failed.",
    brandingSaveSuccess: "Branding settings saved.",
    brandingSaveFailed: "Failed to save branding settings.",
    brandingCompanyPlaceholder: "Enter company name",
    brandingDescPlaceholder: "Submit support tickets and check status instantly.",
    brandingAppTitlePlaceholder: "Customer Support Center",
    brandingAdminTitlePlaceholder: "How can we help?",
    brandingSave: "Save Settings",
    // System management
    systemBackupDownload: "Download Backup",
    systemBackupSuccess: "Backup downloaded.",
    systemBackupFailed: "Backup failed",
    systemRestoreStart: "Start Restore",
    systemRestoreSuccess: "Restore complete. Redirecting to login...",
    systemRestoreSchemaWarning: "Schema version mismatch. Restore completed but some data may have issues.",
    systemRestoreError: "Restore failed",
    systemResetConfirmPlaceholder: "reset",
    systemResetButton: "Reset",
    systemResetSuccess: "Reset complete.",
    systemResetFailed: "Reset failed",
    systemDataTickets: "Tickets & Customer Data",
    systemDataAgents: "Agent Accounts",
    systemDataSettings: "Settings",
    systemDataKnowledge: "Knowledge Base",
    systemDataAuditLogs: "Audit Logs",
    // Email settings
    emailSaveSuccess: "Email settings saved.",
    emailSaveFailed: "Failed to save email settings.",
    emailPasswordPlaceholder: "Enter password",
    emailSecretPlaceholder: "Enter Secret Key",
    emailSaveButton: "Save Settings",
    // LLM settings
    llmSaveButton: "Save Settings",
    llmOllamaSuccess: "Ollama server responded.",
    llmOllamaFailed: "Cannot reach Ollama server.",
    // Git settings
    gitConnected: "Connected",
    gitDisconnected: "Not Connected",
    gitProviderTokenRequired: "Please enter provider and token",
    gitSaveSuccess: "Credentials saved",
    gitSaveFailed: "Failed to save",
    gitSaveError: "An error occurred",
    gitDeleteFailed: "Failed to delete",
    gitDeleteSuccess: "Credentials deleted",
    gitDeleteError: "Failed to delete",
    gitRepoScopeNote: "The 'repo' scope is required for private repository access.",
    gitApiKeyLastUsed: "Last used",
    apiKeyNameAriaLabel: "Key name",
    // Webhooks
    webhookEventTicketCreated: "Ticket Created",
    webhookEventTicketUpdated: "Ticket Updated",
    webhookEventTicketCommented: "Comment Added",
    webhookTestSuccess: "Test webhook sent.",
    webhookTestFailed: "Failed to send test webhook.",
    webhookTestSending: "Sending...",
    webhookLastTriggered: "Last triggered",
    webhookResponseCode: "Response code",
    webhookNone: "None",
    // Request types
    requestTypeSaveSuccess: "Updated",
    requestTypeUpdateSuccess: "Created",
    requestTypeStatusFailed: "Failed to change status",
    requestTypeDeleteFailed: "Failed to delete",
    requestTypeDeleteSuccess: "Deleted",
    requestTypeError: "An error occurred",
    requestTypeDescriptionPlaceholder: "Description for this request type",
    requestTypeTeamPlaceholder: "Select team",
    requestTypeInactive: "No",
    requestTypeCreateButton: "Create",
    requestTypeSaveButton: "Save",
    // Custom fields
    customFieldKeyRequired: "Key is required.",
    customFieldKeyInvalid: "Key may only contain letters, numbers, and underscores.",
    customFieldNameRequired: "Name is required.",
    customFieldOptionsRequired: "Options are required.",
    customFieldEditTitle: "Edit Custom Field",
    customFieldNewTitle: "New Custom Field",
    customFieldSaveSuccess: "Field created.",
    customFieldSaveError: "Error saving field.",
    customFieldActivateSuccess: "Field activated.",
    customFieldDeactivateSuccess: "Field deactivated.",
    customFieldStatusError: "Error changing status.",
    customFieldDeleteSuccess: "Field deleted.",
    customFieldDeleteError: "Error deleting field.",
    customFieldTypeText: "Text",
    customFieldTypeNumber: "Number",
    customFieldTypeDate: "Date",
    customFieldTypeBoolean: "Checkbox",
    customFieldTypeSelect: "Single Select",
    customFieldTypeMultiSelect: "Multi Select",
    customFieldNamePlaceholder: "e.g. Order Number, Product Type",
    customFieldDescriptionPlaceholder: "Additional description for this field",
    customFieldOptionPlaceholder: "option1, option2, option3 (comma-separated)",
    customFieldKeyExamplePlaceholder: "e.g. order_id, product_type",
    // SLA
    slaPolicyActive: "Active",
    slaPolicyInactive: "Inactive",
    slaPolicyRunning: "Running",
    slaPolicyStopped: "Stopped",
    slaPolicyNoDescription: "No description",
    slaPolicyActivateSuccess: "Policy activated.",
    slaPolicyDeactivateSuccess: "Policy deactivated.",
    slaPolicyStatusError: "An error occurred.",
    slaPolicyDeleteConfirm: "Delete this SLA policy?",
    slaPolicyPriority: "Priority",
    slaPolicyFirstResponse: "First Response",
    slaPolicyResolution: "Resolution",
    slaPolicySaving: "Saving...",
    // Automation rules
    automationLoadFailed: "Failed to load automation rules.",
    automationSaveFailed: "Failed to save automation rule.",
    automationCreateSuccess: "Automation rule created.",
    automationActivateSuccess: "Rule activated.",
    automationStatusFailed: "Failed to change rule status.",
    automationDeleteConfirm: "Delete this automation rule?",
    automationDeleteSuccess: "Automation rule deleted.",
    automationDeleteFailed: "Failed to delete automation rule.",
    automationNoDescription: "No description",
    automationConditions: "Conditions",
    automationActions: "Actions",
    automationUnassign: "Unassign",
    automationRuleNameAriaLabel: "Rule name",
    automationDescriptionAriaLabel: "Description",
    automationTriggerAriaLabel: "Trigger",
    automationPriorityAriaLabel: "Execution priority",
    automationCondStatusAriaLabel: "Condition status",
    automationCondPriorityAriaLabel: "Condition priority",
    automationCondEmailAriaLabel: "Customer email condition",
    automationCondKeywordAriaLabel: "Keyword condition",
    automationCondAgeAriaLabel: "Hours since creation",
    automationCondUpdateAgeAriaLabel: "Hours since last update",
    automationActStatusAriaLabel: "Change status",
    automationActPriorityAriaLabel: "Change priority",
    automationActAssigneeAriaLabel: "Reassign agent",
    automationActTeamAriaLabel: "Reassign team",
    automationActTagAriaLabel: "Add tags",
    // SAML
    samlMetaDownloadSuccess: "Metadata file downloaded",
    samlMetaDownloadFailed: "Failed to download metadata file",
    // Chat widget
    chatWidgetSaveSuccess: "Chat widget settings saved.",
    chatWidgetSaveFailed: "Failed to save chat widget settings.",
    chatWidgetLoadFailed: "Failed to load chat widget settings.",
    chatWidgetFloatingEnable: "Enable Floating Chat Button",
    chatWidgetBadgeShow: "Show Unread Badge",
    chatWidgetBadgeColor: "Badge Color",
    chatWidgetBadgePosition: "Badge Position",
    chatWidgetBadgeFixed: "Fixed Badge Text",
    chatWidgetButtonSize: "Button Size",
    chatWidgetButtonShape: "Button Shape",
    chatWidgetButtonShadow: "Button Shadow",
    chatWidgetButtonImageUrl: "Button Image URL",
    chatWidgetButtonImageUpload: "Upload Button Image",
    chatWidgetButtonImageSuccess: "Button image uploaded.",
    chatWidgetButtonImageFailed: "Failed to upload button image.",
    chatWidgetBorderThickness: "Border Thickness",
    chatWidgetBorderColor: "Border Color",
    chatWidgetPointColor: "Accent Color",
    chatWidgetHoverEffect: "Hover Effect",
    chatWidgetLauncherPosition: "Launcher Position",
    // Chat profile manager
    chatProfileAdd: "Add Profile",
    chatProfileName: "Profile Name",
    chatProfileWelcomeTitle: "Welcome Title",
    chatProfileWelcomeMessage: "Welcome Message",
    chatProfileButtonLabel: "Button Label",
    chatProfileImageFit: "Image Fit",
    chatProfileBadgeShow: "Show Unread Badge",
    chatProfileBadgeColor: "Badge Color",
    chatProfileBadgePosition: "Badge Position",
    chatProfileBadgeFixed: "Fixed Badge Text",
    chatProfileButtonSize: "Button Size",
    chatProfileButtonShape: "Button Shape",
    chatProfileButtonShadow: "Button Shadow",
    chatProfileButtonImageUrl: "Button Image URL",
    chatProfileButtonImageUpload: "Upload Button Image",
    chatProfileButtonImageSuccess: "Button image uploaded.",
    chatProfileButtonImageFailed: "Failed to upload button image.",
    chatProfileBorderThickness: "Border Thickness",
    chatProfileBorderColor: "Border Color",
    chatProfilePointColor: "Accent Color",
    chatProfileHoverEffect: "Hover Effect",
    // Chat saved views
    chatViewName: "View Name",
    chatViewSaveSuccess: "View saved.",
    chatViewSaveFailed: "Failed to save view.",
    chatViewDeleteSuccess: "View deleted.",
    chatViewDeleteFailed: "Failed to delete view.",
    chatViewNameRequired: "Please enter a view name.",
    chatStatusUpdateFailed: "Failed to update chat status.",
    chatFilterSla: "SLA Filter",
    chatFilterAssignee: "Assignee Filter",
    chatFilterStatus: "Status Filter",
    chatBrandSupport: "Brand Support",
    chatOnlineSupport: "Chat Support",
    // Ticket form
    ticketFormCreateFailed: "Failed to create ticket.",
    ticketFormUnknownError: "An unknown error occurred.",
    ticketFormSubmit: "Submit Ticket",
    ticketFormSubjectPlaceholder: "Enter inquiry subject",
    ticketFormBodyPlaceholder: "Describe your inquiry in detail (minimum 20 characters)",
    ticketFormOrgPlaceholder: "Company or organization",
    // Comment list
    commentAuthorCustomer: "Customer",
    commentAuthorAgent: "Agent",
    commentRoleCustomer: "Author",
    commentRoleAgent: "Agent",
    // Customer reply form
    customerReplyFailed: "Failed to submit reply.",
    customerReplyError: "An error occurred. Please try again.",
    customerReplyPlaceholder: "Enter any additional questions.",
    // Git integration section
    gitIssueLinkFailed: "Failed to link issue.",
    gitIssueUnlinkFailed: "Failed to unlink.",
    gitIssueUnlinkSuccess: "Issue unlinked.",
    gitIssueSearchFailed: "Failed to search issues.",
    gitIssueSearchError: "Failed to search issues.",
    gitIssueCreateFailed: "Failed to create issue.",
    gitIssueCreateError: "Failed to create issue.",
    gitIssueSearchPlaceholder: "Search issues",
    gitIssueSearchButton: "Search Issues",
    gitIssueSearchLoading: "Searching...",
    gitIssueCreateButton: "Create New Issue",
    gitIssueCreateLoading: "Creating...",
    // Helpdesk operations center
    helpdeskSlaTitle: "Response Goals",
    helpdeskSlaDescription: "Set response/resolution targets per request type to meet service standards.",
    helpdeskAutoTitle: "Auto Processing",
    helpdeskAutoDescription: "Automate repetitive classification, priority changes, and reassignments.",
    helpdeskShortcutsTitle: "Quick Actions",
    helpdeskShortcutsDescription: "Prepare frequently used task lists for agents to open quickly.",
    // Saved filters
    savedFilterNameRequired: "Please enter a filter name.",
    savedFilterSaveSuccess: "Filter saved.",
    savedFilterSaveError: "Error saving filter.",
    savedFilterDeleteSuccess: "Filter deleted.",
    savedFilterDeleteError: "Error deleting filter.",
    savedFilterNamePlaceholder: "Filter name",
    savedFilterSaving: "Saving...",
    // Advanced search
    advancedSearchPlaceholder: "Enter search terms...",
    advancedSearchAll: "All",
    advancedSearchAny: "Any",
    advancedSearchExact: "Exact",
    // Ticket knowledge links
    ticketKnowledgeSearchError: "Error searching documents.",
    ticketKnowledgeLinkSuccess: "Document linked.",
    ticketKnowledgeAlreadyLinked: "Already linked.",
    ticketKnowledgeLinkFailed: "Error linking document.",
    ticketKnowledgeUnlinkSuccess: "Document unlinked.",
    ticketKnowledgeUnlinkFailed: "Error unlinking document.",
    ticketKnowledgeSearchPlaceholder: "Search knowledge articles...",
    ticketKnowledgeSourceAgent: "Agent Insert",
    ticketKnowledgeSourceManual: "Manual Link",
    // Analytics
    analyticsHighUsage: "High Usage",
    analyticsTotalTickets: "Total Tickets",
    analyticsOpenTickets: "Open Tickets",
    analyticsRecentInquiries: "Recent Inquiries",
    analyticsAverageRating: "Average Rating",
    analyticsCoachingPrompt: "Analyze agent performance over the last 30 days to suggest team coaching points.",
```

- [ ] **Step 4: Also remove `businessHoursDayLabels: string` from the interface** (it was listed but isn't needed — day labels come from `daySunday`...`daySaturday` array built at runtime). Verify TypeScript compiles:

```bash
cd /Users/pjw/dev/project/suppo-helpdesk
pnpm --filter=@suppo/shared build 2>&1 | tail -20
```

Expected: no type errors for `admin-copy.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/i18n/admin-copy.ts
git commit -m "feat(i18n): expand AdminCopy with all admin UI string keys (KO+EN)"
```

---

## Task 2: Wire admin-nav.ts + AdminShell navigation

**Files:**
- Modify: `apps/admin/src/lib/navigation/admin-nav.ts`
- Modify: `apps/admin/src/components/admin-shell.tsx`

The `getAdminNavSections` function currently has hardcoded Korean labels. Pass `AdminCopy` as an optional second parameter so the shell can pass localized labels.

- [ ] **Step 1: Update `admin-nav.ts`**

Replace the full file content of `apps/admin/src/lib/navigation/admin-nav.ts`:

```typescript
import type { BackofficeRole } from "@suppo/shared/auth/config";
import type { AdminCopy } from "@suppo/shared/i18n/admin-copy";

export type AdminNavItemKey =
  | "dashboard" | "analytics" | "knowledge" | "chats" | "chat-settings"
  | "integration-settings" | "tickets" | "agents" | "calendar" | "teams"
  | "customers" | "request-types" | "saml" | "git" | "email" | "branding"
  | "operations" | "business-hours" | "llm" | "system" | "templates" | "audit-logs";

type AdminNavSectionKey = "main" | "settings" | "tools" | "logs";

export interface AdminNavItem {
  key: AdminNavItemKey;
  href: string;
  label: string;
}

export interface AdminNavSection {
  key: AdminNavSectionKey;
  title: string | null;
  items: AdminNavItem[];
}

const NAV_ITEMS: Array<
  { key: AdminNavItemKey; href: string; section: AdminNavSectionKey; adminOnly?: boolean; hiddenForRoles?: BackofficeRole[] }
> = [
  { key: "dashboard",           href: "/admin/dashboard",              section: "main" },
  { key: "analytics",           href: "/admin/analytics",              section: "main" },
  { key: "knowledge",           href: "/admin/knowledge",              section: "main" },
  { key: "chats",               href: "/admin/chats",                  section: "main" },
  { key: "tickets",             href: "/admin/tickets",                section: "main" },
  { key: "agents",              href: "/admin/agents",                 section: "main", hiddenForRoles: ["VIEWER"] },
  { key: "calendar",            href: "/admin/calendar",               section: "main", hiddenForRoles: ["VIEWER"] },
  { key: "teams",               href: "/admin/teams",                  section: "main", adminOnly: true },
  { key: "customers",           href: "/admin/customers",              section: "main", adminOnly: true },
  { key: "request-types",       href: "/admin/settings/request-types", section: "settings", adminOnly: true },
  { key: "saml",                href: "/admin/settings/saml",          section: "settings", adminOnly: true },
  { key: "git",                 href: "/admin/settings/git",           section: "settings", adminOnly: true },
  { key: "email",               href: "/admin/settings/email",         section: "settings", adminOnly: true },
  { key: "integration-settings",href: "/admin/settings/integrations",  section: "settings", adminOnly: true },
  { key: "chat-settings",       href: "/admin/settings/chat",          section: "settings", adminOnly: true },
  { key: "branding",            href: "/admin/settings/branding",      section: "settings", adminOnly: true },
  { key: "business-hours",      href: "/admin/settings/business-hours",section: "settings", adminOnly: true },
  { key: "operations",          href: "/admin/settings/operations",    section: "settings", adminOnly: true },
  { key: "llm",                 href: "/admin/settings/llm",           section: "settings", adminOnly: true },
  { key: "system",              href: "/admin/settings/system",        section: "settings", adminOnly: true },
  { key: "templates",           href: "/admin/templates",              section: "tools", hiddenForRoles: ["VIEWER"] },
  { key: "audit-logs",          href: "/admin/audit-logs",             section: "logs", adminOnly: true },
];

function getNavLabel(key: AdminNavItemKey, copy?: AdminCopy): string {
  if (!copy) {
    const fallbacks: Record<AdminNavItemKey, string> = {
      dashboard: "대시보드", analytics: "분석 및 리포트", knowledge: "지식",
      chats: "실시간 채팅", tickets: "티켓 목록", agents: "상담원 관리",
      calendar: "일정 관리", teams: "팀 관리", customers: "고객 관리",
      "request-types": "문의 유형", saml: "SAML SSO", git: "Git 연동",
      email: "이메일 연동", "integration-settings": "연동 설정",
      "chat-settings": "채팅 설정", branding: "브랜딩",
      "business-hours": "영업시간", operations: "업무 규칙",
      llm: "AI 연동", system: "시스템", templates: "응답 템플릿",
      "audit-logs": "감사 로그",
    };
    return fallbacks[key];
  }
  const map: Record<AdminNavItemKey, string> = {
    dashboard: copy.navDashboard,
    analytics: copy.navAnalytics,
    knowledge: copy.navKnowledge,
    chats: copy.navChats,
    tickets: copy.navTickets,
    agents: copy.navAgents,
    calendar: copy.navCalendar,
    teams: copy.navTeams,
    customers: copy.navCustomers,
    "request-types": copy.settingsRequestTypes,
    saml: copy.settingsSAML,
    git: copy.settingsGit,
    email: copy.settingsEmail,
    "integration-settings": copy.settingsIntegrations,
    "chat-settings": copy.settingsChatSettings,
    branding: copy.settingsBranding,
    "business-hours": copy.settingsBusinessHours,
    operations: copy.settingsOperations,
    llm: copy.settingsLLM,
    system: copy.settingsSystem,
    templates: copy.navTemplates,
    "audit-logs": copy.navAuditLogs,
  };
  return map[key];
}

function getSectionTitle(key: AdminNavSectionKey, copy?: AdminCopy): string | null {
  if (key === "main") return null;
  if (!copy) {
    const fallbacks: Record<Exclude<AdminNavSectionKey, "main">, string> = {
      settings: "설정", tools: "도구", logs: "로그",
    };
    return fallbacks[key];
  }
  const map: Record<Exclude<AdminNavSectionKey, "main">, string> = {
    settings: copy.sectionSettings,
    tools: copy.sectionTools,
    logs: copy.sectionLogs,
  };
  return map[key];
}

export function getAdminNavSections(
  roleInput: boolean | BackofficeRole | undefined,
  copy?: AdminCopy
): AdminNavSection[] {
  const role: BackofficeRole =
    typeof roleInput === "boolean" ? (roleInput ? "ADMIN" : "AGENT") : roleInput ?? "AGENT";
  const isAdmin = role === "ADMIN";
  const sections: AdminNavSection[] = [];

  for (const sectionKey of ["main", "settings", "tools", "logs"] as const) {
    const items = NAV_ITEMS.filter(
      (item) =>
        item.section === sectionKey &&
        (!item.adminOnly || isAdmin) &&
        !(item.hiddenForRoles?.includes(role))
    ).map(({ key, href }) => ({ key, href, label: getNavLabel(key, copy) }));

    if (items.length > 0) {
      sections.push({ key: sectionKey, title: getSectionTitle(sectionKey, copy), items });
    }
  }

  return sections;
}
```

- [ ] **Step 2: Update `admin-shell.tsx` — pass `copy` to `getAdminNavSections`**

Find line `const navSections = getAdminNavSections(userRole);` and change to:

```typescript
  const navSections = getAdminNavSections(userRole, copy);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/pjw/dev/project/suppo-helpdesk
pnpm --filter=@suppo/admin build 2>&1 | tail -30
```

Expected: no errors in admin-nav.ts or admin-shell.tsx.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/lib/navigation/admin-nav.ts apps/admin/src/components/admin-shell.tsx
git commit -m "feat(i18n): wire navigation labels and section titles to AdminCopy"
```

---

## Task 3: Ticket list + ticket filters

**Files:**
- Modify: `apps/admin/src/components/admin/ticket-list.tsx`
- Modify: `apps/admin/src/components/admin/ticket-filters.tsx`

- [ ] **Step 1: Wire `ticket-list.tsx`**

Add `useAdminCopy` import at the top of imports:
```typescript
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
```

At the top of the `TicketList` component function, add:
```typescript
const copy = useAdminCopy();
```

Replace the hardcoded `STATUS_LABELS` and `PRIORITY_LABELS` maps (around lines 36-57):
```typescript
// REMOVE the hardcoded STATUS_LABELS and PRIORITY_LABELS const blocks entirely.
// Replace references throughout with copy.ticketStatus* and copy.ticketsPriority*
```

Specifically:
- `STATUS_LABELS["OPEN"]` → `copy.ticketStatusOpen`
- `STATUS_LABELS["IN_PROGRESS"]` → `copy.ticketStatusInProgress`
- `STATUS_LABELS["WAITING"]` → `copy.ticketStatusWaiting`
- `STATUS_LABELS["RESOLVED"]` → `copy.ticketStatusResolved`
- `STATUS_LABELS["CLOSED"]` → `copy.ticketStatusClosed`
- `PRIORITY_LABELS["URGENT"]` → `copy.ticketsPriorityUrgent`
- `PRIORITY_LABELS["HIGH"]` → `copy.ticketsPriorityHigh`
- `PRIORITY_LABELS["MEDIUM"]` → `copy.ticketsPriorityMedium`
- `PRIORITY_LABELS["LOW"]` → `copy.ticketsPriorityLow`

Replace toast strings:
- `"일괄 변경할 항목을 선택해주세요."` → `copy.ticketsBulkSelectRequired`
- `"일괄 변경이 완료되었습니다."` → `copy.ticketsBulkSuccess`
- `"일괄 변경에 실패했습니다."` → `copy.ticketsBulkFailed`

Replace UI strings:
- `placeholder="상태 변경"` → `placeholder={copy.ticketsBulkStatus}`
- `placeholder="우선순위 변경"` → `placeholder={copy.ticketsBulkPriority}`
- `placeholder="담당자 변경"` → `placeholder={copy.ticketsBulkAssignee}`
- `"벌크 적용"` → `{copy.ticketsBulkApply}`
- `aria-label="전체 선택"` → `aria-label={copy.ticketsSelectAll}`
- `aria-label="벌크 상태 변경"` → `aria-label={copy.ticketsBulkStatus}`
- `aria-label="벌크 우선순위 변경"` → `aria-label={copy.ticketsBulkPriority}`
- `aria-label="벌크 담당자 변경"` → `aria-label={copy.ticketsBulkAssignee}`

- [ ] **Step 2: Wire `ticket-filters.tsx`**

Add import:
```typescript
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
import { enUS, ko as koLocale } from "date-fns/locale";
```

At top of `TicketFilters` component:
```typescript
const copy = useAdminCopy();
const dateLocale = copy.locale === "en" ? enUS : koLocale;
```

Replace all hardcoded strings:
- `placeholder="티켓 번호, 제목, 이메일 검색..."` → `placeholder={copy.ticketsSearchPlaceholder}`
- `aria-label="상태 필터"` → `aria-label={copy.ticketsFilterStatus}`
- `placeholder="상태"` → `placeholder={copy.ticketsFilterStatus}`
- `aria-label="우선순위 필터"` → `aria-label={copy.ticketsFilterPriority}`
- `placeholder="우선순위"` → `placeholder={copy.ticketsFilterPriority}`
- `aria-label="문의 유형 필터"` → `aria-label={copy.ticketsFilterRequestType}`
- `placeholder="문의 유형"` → `placeholder={copy.ticketsFilterRequestType}`
- `aria-label="담당자 필터"` → `aria-label={copy.ticketsFilterAssignee}`
- `placeholder="담당자"` → `placeholder={copy.ticketsFilterAssignee}`
- Date format `ko` locale → `dateLocale`
- `"시작일"` (fallback when no date) → `copy.ticketsDateFrom`
- `"종료일"` (fallback when no date) → `copy.ticketsDateTo`

- [ ] **Step 3: Verify build**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/components/admin/ticket-list.tsx apps/admin/src/components/admin/ticket-filters.tsx
git commit -m "feat(i18n): wire ticket list and filters to AdminCopy"
```

---

## Task 4: Ticket detail components

**Files:**
- Modify: `apps/admin/src/components/admin/ticket-detail.tsx`
- Modify: `apps/admin/src/components/admin/ticket-detail-extended.tsx`
- Modify: `apps/admin/src/components/admin/ticket-workspace-summary.tsx`
- Modify: `apps/admin/src/components/admin/ticket-relations-panel.tsx`

**Pattern for `ticket-detail.tsx` and `ticket-detail-extended.tsx`** — both have the same hardcoded status/priority maps and same toast strings.

For each of the two files, apply:

- [ ] **Step 1: Add import + `const copy = useAdminCopy()`**

```typescript
import { useAdminCopy } from "@suppo/shared/i18n/admin-context";
// inside component:
const copy = useAdminCopy();
```

- [ ] **Step 2: Replace `TICKET_STATUS` and `PRIORITY_CONFIG` maps**

Remove the const declarations. Replace inline usage:
- `TICKET_STATUS[status]?.label` → lookup via copy:

```typescript
function getStatusLabel(status: string, copy: ReturnType<typeof useAdminCopy>): string {
  const map: Record<string, string> = {
    OPEN: copy.ticketStatusOpen,
    IN_PROGRESS: copy.ticketStatusInProgress,
    WAITING: copy.ticketStatusWaiting,
    RESOLVED: copy.ticketStatusResolved,
    CLOSED: copy.ticketStatusClosed,
  };
  return map[status] ?? status;
}

function getPriorityLabel(priority: string, copy: ReturnType<typeof useAdminCopy>): string {
  const map: Record<string, string> = {
    URGENT: copy.ticketsPriorityUrgent,
    HIGH: copy.ticketsPriorityHigh,
    MEDIUM: copy.ticketsPriorityMedium,
    LOW: copy.ticketsPriorityLow,
  };
  return map[priority] ?? priority;
}
```

Define these two helpers at file scope (outside the component).

- [ ] **Step 3: Replace remaining strings in both files**

- `toast.error("권한이 없습니다.")` → `toast.error(copy.ticketDetailUnauthorized)`
- `toast.success("업데이트 되었습니다.")` → `toast.success(copy.ticketDetailUpdateSuccess)`
- `toast.error("업데이트 중 오류가 발생했습니다.")` → `toast.error(copy.ticketDetailUpdateFailed)`
- `placeholder="상태"` → `placeholder={copy.ticketsFilterStatus}`
- `placeholder="우선순위"` → `placeholder={copy.ticketsFilterPriority}`
- `placeholder="담당자"` → `placeholder={copy.ticketsFilterAssignee}`
- `|| "미할당"` → `|| copy.ticketDetailUnassigned`
- `|| "시스템"` → `|| copy.ticketDetailActorSystem`

- [ ] **Step 4: Wire `ticket-workspace-summary.tsx`**

Add import + `const copy = useAdminCopy()`.

Replace:
- `label="현재 상태"` → `label={copy.ticketDetailCurrentStatus}`
- `label="우선순위"` → `label={copy.ticketsFilterPriority}`
- `label="담당자"` → `label={copy.ticketsFilterAssignee}`
- `label="문의 유형"` → `label={copy.ticketsFilterRequestType}`
- `"바로 처리 가능"` → `copy.ticketDetailCanEdit`
- `"읽기 전용 모드"` → `copy.ticketDetailReadOnly`
- `"응답 작성과 내부 메모 등록을 바로 진행할 수 있습니다."` → `copy.ticketDetailCanEditDesc`
- `"담당자이거나 관리자일 때 응답과 내부 메모를 남길 수 있습니다."` → `copy.ticketDetailReadOnlyDesc`

- [ ] **Step 5: Wire `ticket-relations-panel.tsx`**

Add import + `const copy = useAdminCopy()`.

Replace:
- `title="원본 티켓"` → `title={copy.ticketDetailSourceTicket}`
- `title="대상 티켓"` → `title={copy.ticketDetailTargetTicket}`

- [ ] **Step 6: Build check**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
```

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/components/admin/ticket-detail.tsx apps/admin/src/components/admin/ticket-detail-extended.tsx apps/admin/src/components/admin/ticket-workspace-summary.tsx apps/admin/src/components/admin/ticket-relations-panel.tsx
git commit -m "feat(i18n): wire ticket detail components to AdminCopy"
```

---

## Task 5: Ticket workspace — comments, merge, transfer

**Files:**
- Modify: `apps/admin/src/components/admin/comment-section.tsx`
- Modify: `apps/admin/src/components/admin/comment-thread.tsx`
- Modify: `apps/admin/src/components/admin/internal-note-form.tsx`
- Modify: `apps/admin/src/components/admin/ticket-merge-dialog.tsx`
- Modify: `apps/admin/src/components/admin/transfer-dialog.tsx`

For each file: add `import { useAdminCopy }` and `const copy = useAdminCopy()`.

- [ ] **Step 1: Wire `comment-section.tsx`**

- `aria-label="응답 작성"` → `aria-label={copy.commentWriteAriaLabel}`
- `placeholder={isLocked && !isLockedByMe ? "다른 상담원이 편집 중입니다..." : "응답을 입력하세요..."}` → `placeholder={isLocked && !isLockedByMe ? copy.commentLockedPlaceholder : copy.commentResponsePlaceholder}`
- `aria-label="내부 메모로 저장"` → `aria-label={copy.commentInternalNoteAriaLabel}`
- `{isGeneratingSuggestion ? "생성 중..." : "AI 답변 제안"}` → `{isGeneratingSuggestion ? copy.commentAiSuggestLoading : copy.commentAiSuggest}`
- `{loading ? "전송중..." : "전송"}` → `{loading ? copy.commonSending : copy.commonSend}`

- [ ] **Step 2: Wire `comment-thread.tsx`**

- `toast.error("내용을 입력해주세요")` → `toast.error(copy.commentContentRequired)`
- `|| "수정에 실패했습니다"` (Error) → `|| copy.commentUpdateFailed`
- `toast.success("댓글이 수정되었습니다")` → `toast.success(copy.commentUpdateSuccess)`
- `copy.commentUpdateError` (catch block) → `toast.error(... copy.commentUpdateError)`
- `|| "삭제에 실패했습니다"` → `|| copy.commentDeleteFailed`
- `toast.success("댓글이 삭제되었습니다")` → `toast.success(copy.commentDeleteSuccess)`
- `copy.commentDeleteError` (catch block) → `toast.error(... copy.commentDeleteError)`

- [ ] **Step 3: Wire `internal-note-form.tsx`**

- `toast.error("내용을 입력해주세요.")` → `toast.error(copy.internalNoteContentRequired)`
- `throw new Error("응답 등록 실패")` → `throw new Error(copy.internalNoteFailed)`
- `toast.success(isInternal ? "내부 메모가 등록되었습니다." : "응답이 등록되었습니다.")` → `toast.success(isInternal ? copy.internalNoteSuccess : copy.internalNoteResponseSuccess)`
- `toast.error("응답 등록 중 오류가 발생했습니다.")` → `toast.error(copy.internalNoteError)`
- `placeholder="응답 또는 내부 메모를 작성하세요..."` → `placeholder={copy.internalNotePlaceholder}`
- `aria-label="응답 작성"` → `aria-label={copy.commentWriteAriaLabel}`
- `aria-label="내부 메모로 저장"` → `aria-label={copy.commentInternalNoteAriaLabel}`
- `{isSubmitting ? "전송 중..." : "전송"}` → `{isSubmitting ? copy.internalNoteSubmitting : copy.commonSend}`

- [ ] **Step 4: Wire `ticket-merge-dialog.tsx`**

- `toast.error("병합할 티켓을 선택해주세요.")` → `toast.error(copy.ticketMergeSelectRequired)`
- `toast.error("병합에 문제가 있습니다. 충돌을 확인해주세요.")` → `toast.error(copy.ticketMergeConflict)`
- `toast.success("티켓이 병합되었습니다.")` → `toast.success(copy.ticketMergeSuccess)`
- `toast.error("병합 중 오류가 발생했습니다.")` → `toast.error(copy.ticketMergeFailed)`
- `? "담당자"` → `? copy.ticketMergeFieldAssignee`
- `? "팀"` → `? copy.ticketMergeFieldTeam`
- `? "상태"` → `? copy.ticketMergeFieldStatus`
- `placeholder="병합 이유를 입력해주세요..."` → `placeholder={copy.ticketMergeReasonPlaceholder}`
- `"검증"` → `{copy.ticketMergeValidate}`

- [ ] **Step 5: Wire `transfer-dialog.tsx`**

The component receives `triggerLabel` as a prop with default `"양도"`. Change the default:
```typescript
triggerLabel = copy.ticketTransferLabel,
```
Wait — props can't use `copy` since hooks can't be called before the function body. Instead, keep the prop but update callers, OR change the default to use the copy inside the component and ignore the prop's default.

Best approach: keep prop but add inside the component body:
```typescript
const copy = useAdminCopy();
const resolvedTriggerLabel = triggerLabel ?? copy.ticketTransferLabel;
```
Then use `resolvedTriggerLabel` where `triggerLabel` is displayed.

Replace other strings:
- `setError("양도할 상담원을 선택해주세요")` → `setError(copy.ticketTransferSelectRequired)`
- `setError(data.error ?? "양도 처리에 실패했습니다")` → `setError(data.error ?? copy.ticketTransferFailed)`
- `setError("양도 처리 중 오류가 발생했습니다")` → `setError(copy.ticketTransferError)`
- `placeholder="양도 사유를 입력하세요"` → `placeholder={copy.ticketTransferReasonPlaceholder}`
- `{isSubmitting ? "처리 중..." : "양도"}` → `{isSubmitting ? copy.ticketTransferSubmitting : resolvedTriggerLabel}`

- [ ] **Step 6: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/admin/comment-section.tsx apps/admin/src/components/admin/comment-thread.tsx apps/admin/src/components/admin/internal-note-form.tsx apps/admin/src/components/admin/ticket-merge-dialog.tsx apps/admin/src/components/admin/transfer-dialog.tsx
git commit -m "feat(i18n): wire ticket workspace comment/merge/transfer components"
```

---

## Task 6: Agent management

**Files:**
- Modify: `apps/admin/src/components/admin/agent-list.tsx`

- [ ] **Step 1: Add import + `const copy = useAdminCopy()`**

- [ ] **Step 2: Replace all hardcoded strings**

Toast messages:
- `"이름과 이메일을 입력해주세요"` → `copy.agentsNameEmailRequired`
- `data.error ?? "상담원 추가에 실패했습니다"` → `data.error ?? copy.agentsAddFailed`
- `"상담원이 추가되었습니다"` → `copy.agentsAddSuccess`
- `"상담원 추가 중 오류가 발생했습니다"` → `copy.agentsAddError`
- `data.error ?? "상담원 수정에 실패했습니다"` → `data.error ?? copy.agentsEditFailed`
- `"상담원 정보가 수정되었습니다"` → `copy.agentsEditSuccess`
- `"상담원 수정 중 오류가 발생했습니다"` → `copy.agentsEditError`
- `data.error ?? "비활성화에 실패했습니다"` → `data.error ?? copy.agentsDeactivateFailed`
- `"상담원이 비활성화되었습니다"` → `copy.agentsDeactivateSuccess`
- `"비활성화 처리 중 오류가 발생했습니다"` → `copy.agentsDeactivateError`
- `data.error ?? "삭제에 실패했습니다"` → `data.error ?? copy.agentsDeleteFailed`
- `"상담원이 삭제되었습니다"` → `copy.agentsDeleteSuccess`
- `"삭제 처리 중 오류가 발생했습니다"` → `copy.agentsDeleteError`
- `data.error ?? "비밀번호 초기화에 실패했습니다"` → `data.error ?? copy.agentsPasswordResetFailed`
- `"비밀번호 초기화 중 오류가 발생했습니다"` → `copy.agentsPasswordResetError`

UI strings:
- `placeholder="이름 또는 이메일로 검색..."` → `placeholder={copy.agentsSearchPlaceholder}`
- `placeholder="홍길동"` — **keep as-is** (example Korean name for name input)
- `placeholder="팀장으로 지정할 팀 선택"` (both occurrences) → `placeholder={copy.agentsTeamLeadPlaceholder}`
- `"저장"` (button in agent form) → `{copy.agentsSave}` (already in copy)
- `"비활성"` (status badge) → `{copy.commonInactive}`
- `"추가하기"` (button) → `{copy.commonAdd}`

- [ ] **Step 3: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/admin/agent-list.tsx
git commit -m "feat(i18n): wire agent list to AdminCopy"
```

---

## Task 7: Teams, customers, customer snapshot, audit logs

**Files:**
- Modify: `apps/admin/src/components/admin/team-list.tsx`
- Modify: `apps/admin/src/components/admin/customer-list.tsx`
- Modify: `apps/admin/src/components/admin/customer-snapshot-card.tsx`
- Modify: `apps/admin/src/components/admin/customer-insights-panel.tsx`
- Modify: `apps/admin/src/components/admin/audit-log-list.tsx`

For each: add `useAdminCopy` import + `const copy = useAdminCopy()`.

- [ ] **Step 1: Wire `team-list.tsx`**

- `|| "생성에 실패했습니다"` → `|| copy.teamsStatusFailed`
- `toast.success("팀이 생성되었습니다")` → `toast.success(copy.teamsCreateSuccess)`
- `throw new Error("상태 변경에 실패했습니다")` → `throw new Error(copy.teamsStatusFailed)`
- `toast.error("상태 변경에 실패했습니다")` → `toast.error(copy.teamsStatusError)`
- `toast.error("오류가 발생했습니다")` (create catch) → `toast.error(copy.teamsCreateError)`
- `toast.error("비활성화되었습니다")` (should be success) → check logic — it's probably `toast.success(copy.teamsDeactivateSuccess)`
- `toast.error("오류가 발생했습니다")` (deactivate catch) → `toast.error(copy.teamsDeactivateError)`
- `placeholder="팀에 대한 설명"` → `placeholder={copy.teamsDescriptionPlaceholder}`
- `"생성"` (submit button) → `{copy.commonCreate}`

- [ ] **Step 2: Wire `customer-list.tsx`**

- `placeholder="이름 또는 이메일로 검색..."` → `placeholder={copy.customersSearchPlaceholder}`
- `"문의 내역 없음"` → `{copy.customersNoHistory}`

- [ ] **Step 3: Wire `customer-snapshot-card.tsx`**

- `label="총 문의"` → `label={copy.customersTotalTickets}`
- `label="열린 티켓"` → `label={copy.customersOpenTickets}`
- `label="고객 만족도"` → `label={copy.customersCsat}`
- `label="최근 문의"` → `label={copy.customersRecentInquiry}`

- [ ] **Step 4: Wire `customer-insights-panel.tsx`**

Remove `STATUS_LABELS` map. Replace:
- `"열림"` → `copy.ticketStatusOpen`
- `"진행중"` → `copy.ticketStatusInProgress`
- `"대기중"` → `copy.ticketStatusWaiting`
- `"해결됨"` → `copy.ticketStatusResolved`
- `"종료"` → `copy.ticketStatusClosed`
- `title="총 티켓"` → `title={copy.analyticsTotalTickets}`
- `title="오픈 티켓"` → `title={copy.analyticsOpenTickets}`
- `title="해결됨"` → `title={copy.ticketStatusResolved}`
- `title="고객 만족도"` → `title={copy.customersCsat}`

- [ ] **Step 5: Wire `audit-log-list.tsx`**

- `placeholder="작업자 이름/이메일 검색"` → `placeholder={copy.auditLogsActorPlaceholder}`
- `placeholder="작업 유형"` → `placeholder={copy.auditLogsActionPlaceholder}`
- `placeholder="리소스 유형"` → `placeholder={copy.auditLogsResourcePlaceholder}`
- `placeholder="시작일"` → `placeholder={copy.auditLogsDateFromPlaceholder}`
- `placeholder="종료일"` → `placeholder={copy.auditLogsDateToPlaceholder}`
- `description="현재 필터 조건의 감사 로그에서 비정상 패턴을 AI가 탐지합니다."` → `description={copy.auditLogsAiDescription}`

- [ ] **Step 6: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/admin/team-list.tsx apps/admin/src/components/admin/customer-list.tsx apps/admin/src/components/admin/customer-snapshot-card.tsx apps/admin/src/components/admin/customer-insights-panel.tsx apps/admin/src/components/admin/audit-log-list.tsx
git commit -m "feat(i18n): wire team, customer, audit log components"
```

---

## Task 8: Knowledge base + templates + categories

**Files:**
- Modify: `apps/admin/src/components/admin/knowledge-list.tsx`
- Modify: `apps/admin/src/components/admin/knowledge-form.tsx`
- Modify: `apps/admin/src/components/admin/template-form.tsx`
- Modify: `apps/admin/src/components/admin/template-list.tsx`
- Modify: `apps/admin/src/components/admin/category-manager.tsx`
- Modify: `apps/admin/src/components/admin/ticket-knowledge-links.tsx`

For each: add `useAdminCopy` import + `const copy = useAdminCopy()`.

- [ ] **Step 1: Wire `knowledge-list.tsx`**

- `toast.success("문서가 삭제되었습니다")` → `toast.success(copy.knowledgeDeleteSuccess)`
- `toast.error("삭제 중 오류가 발생했습니다")` → `toast.error(copy.knowledgeDeleteError)`
- `placeholder="문서 검색..."` → `placeholder={copy.knowledgeSearchPlaceholder}`
- `placeholder="카테고리"` → `placeholder={copy.knowledgeCategoryPlaceholder}`
- `placeholder="상태"` → `placeholder={copy.ticketsFilterStatus}`
- `title="공개 링크"` → `title={copy.knowledgePublicLink}`
- `aria-label="공개 링크"` → `aria-label={copy.knowledgePublicLink}`
- `title="수정"` → `title={copy.commonEdit}`
- `title="삭제"` → `title={copy.commonDelete}`
- `"삭제"` (button) → `{copy.commonDelete}`

- [ ] **Step 2: Wire `knowledge-form.tsx`**

- `toast.error("제목을 입력해주세요")` → `toast.error(copy.knowledgeTitleRequired)`
- `toast.error("슬러그를 입력해주세요")` → `toast.error(copy.knowledgeSlugRequired)`
- `toast.error("내용을 입력해주세요")` → `toast.error(copy.knowledgeContentRequired)`
- `toast.error("카테고리를 선택해주세요")` → `toast.error(copy.knowledgeCategoryRequired)`
- `"문서가 저장되었습니다"` → `copy.knowledgeSaveSuccess`
- `"저장 중 오류가 발생했습니다"` → `copy.knowledgeSaveError`
- `{title || "제목 없음"}` → `{title || copy.knowledgeNoTitle}`
- `placeholder="문서 제목을 입력하세요"` → `placeholder={copy.knowledgeTitlePlaceholder}`
- `placeholder="문서-url-slug"` → keep as-is (URL format)
- Status description strings → use `copy.knowledgeStatus*Desc` keys
- `placeholder="문서 내용을 간략히 요약해주세요 (선택사항)"` → `placeholder={copy.knowledgeSummaryPlaceholder}`
- `placeholder="카테고리 선택"` → `placeholder={copy.knowledgeCategoryPlaceholder}`
- `placeholder="새 태그 입력"` → `placeholder={copy.knowledgeNewTagPlaceholder}`
- `placeholder="마크다운 형식으로 내용을 작성하세요..."` → `placeholder={copy.knowledgeContentPlaceholder}`
- `"게시하기"` → `{copy.commonPublish}`
- `"초안 저장"` → `{copy.commonSaveDraft}`

- [ ] **Step 3: Wire `template-form.tsx`**

- `toast.error("제목과 내용을 입력해주세요.")` → `toast.error(copy.templatesTitleContentRequired)`
- `data.error || "저장 중 오류가 발생했습니다."` → `data.error || copy.templatesSaveError`
- `toast.error("저장 중 오류가 발생했습니다.")` → `toast.error(copy.templatesSaveError)`
- `"템플릿이 생성되었습니다."` → `copy.templatesCreateSuccess`
- `placeholder="카테고리 선택"` → `placeholder={copy.templatesCategoryPlaceholder}`
- `placeholder="문의 유형 선택"` → `placeholder={copy.templatesRequestTypePlaceholder}`
- `placeholder="템플릿 내용을 입력하세요. 변수를 사용하려면 위의 버튼을 클릭하세요."` → `placeholder={copy.templatesContentPlaceholder}`
- `"생성하기"` → `{copy.templatesCreateButton}`
- Variable `description` fields like `"티켓 번호"`, `"티켓 제목"` etc. — keep as-is (these are variable descriptions that are functional metadata)

- [ ] **Step 4: Wire `template-list.tsx`**

- `toast.success("템플릿이 삭제되었습니다.")` → `toast.success(copy.templatesDeleteSuccess)`
- `data.error || "삭제 중 오류가 발생했습니다."` → `data.error || copy.templatesDeleteError`
- `toast.error("삭제 중 오류가 발생했습니다.")` → `toast.error(copy.templatesDeleteError)`
- `"알 수 없음"` → `{copy.templatesUnknown}`

- [ ] **Step 5: Wire `category-manager.tsx`**

- `toast.error("카테고리 이름을 입력하세요")` → `toast.error(copy.categoriesNameRequired)`
- `toast.success(isEditing ? "카테고리가 수정되었습니다" : "카테고리가 생성되었습니다")` → `toast.success(isEditing ? copy.categoriesEditSuccess : copy.categoriesCreateSuccess)`
- `toast.error(... "오류가 발생했습니다")` → `toast.error(copy.categoriesError)`
- `toast.success("카테고리가 삭제되었습니다")` → `toast.success(copy.categoriesDeleteSuccess)`
- `toast.error(... "오류가 발생했습니다")` (delete) → `toast.error(copy.categoriesDeleteError)`
- `{isDeleting === category.id ? "삭제 중..." : "삭제"}` → `{isDeleting === category.id ? copy.commonDeleting : copy.commonDelete}`
- `{isEditing ? "카테고리 수정" : "새 카테고리"}` → `{isEditing ? copy.categoriesEditTitle : copy.categoriesNewTitle}`
- `placeholder="카테고리 이름"` → `placeholder={copy.categoriesNamePlaceholder}`
- `"슬러그는 수정할 수 없습니다"` → `{copy.categoriesSlugReadonly}`
- `"자동으로 생성됩니다 (수정 가능)"` → `{copy.categoriesSlugAutoGenerated}`
- `placeholder="카테고리 설명"` → `placeholder={copy.categoriesDescriptionPlaceholder}`
- `{isEditing ? "수정" : "추가"}` → `{isEditing ? copy.commonEdit : copy.commonAdd}`

- [ ] **Step 6: Wire `ticket-knowledge-links.tsx`**

Remove `LINK_SOURCE_LABELS` map if present. Replace:
- `"상담원 삽입"` → `copy.ticketKnowledgeSourceAgent`
- `"수동 연결"` → `copy.ticketKnowledgeSourceManual`
- `toast.error("검색 중 오류가 발생했습니다.")` → `toast.error(copy.ticketKnowledgeSearchError)`
- `toast.success("문서가 연결되었습니다.")` → `toast.success(copy.ticketKnowledgeLinkSuccess)`
- `toast.info("이미 연결된 문서입니다.")` → `toast.info(copy.ticketKnowledgeAlreadyLinked)`
- `toast.error("연결 중 오류가 발생했습니다.")` → `toast.error(copy.ticketKnowledgeLinkFailed)`
- `toast.success("연결이 해제되었습니다.")` → `toast.success(copy.ticketKnowledgeUnlinkSuccess)`
- `toast.error("연결 해제 중 오류가 발생했습니다.")` → `toast.error(copy.ticketKnowledgeUnlinkFailed)`
- `placeholder="지식 문서 검색..."` → `placeholder={copy.ticketKnowledgeSearchPlaceholder}`

- [ ] **Step 7: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/admin/knowledge-list.tsx apps/admin/src/components/admin/knowledge-form.tsx apps/admin/src/components/admin/template-form.tsx apps/admin/src/components/admin/template-list.tsx apps/admin/src/components/admin/category-manager.tsx apps/admin/src/components/admin/ticket-knowledge-links.tsx
git commit -m "feat(i18n): wire knowledge, template, category components"
```

---

## Task 9: Basic settings forms

**Files:**
- Modify: `apps/admin/src/components/admin/business-hours-form.tsx`
- Modify: `apps/admin/src/components/admin/branding-form.tsx`
- Modify: `apps/admin/src/components/admin/email-settings-form.tsx`
- Modify: `apps/admin/src/components/admin/llm-settings-form.tsx`
- Modify: `apps/admin/src/components/admin/system-management.tsx`

For each: add `useAdminCopy` import + `const copy = useAdminCopy()`.

- [ ] **Step 1: Wire `business-hours-form.tsx`**

Replace `DAY_LABELS` array:
```typescript
// Remove: const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
// Replace with:
const DAY_LABELS = [
  copy.daySunday, copy.dayMonday, copy.dayTuesday, copy.dayWednesday,
  copy.dayThursday, copy.dayFriday, copy.daySaturday,
];
```

Replace `TIMEZONES` array labels:
```typescript
const TIMEZONES = [
  { id: "Asia/Seoul",          label: copy.businessHoursTimezoneSeoul },
  { id: "Asia/Tokyo",          label: copy.businessHoursTimezoneTokyo },
  { id: "Asia/Shanghai",       label: copy.businessHoursTimezoneShanghai },
  { id: "Asia/Singapore",      label: copy.businessHoursTimezoneSingapore },
  { id: "Europe/London",       label: copy.businessHoursTimezoneLondon },
  { id: "Europe/Paris",        label: copy.businessHoursTimezoneParis },
  { id: "America/New_York",    label: copy.businessHoursTimezoneNewYork },
  { id: "America/Los_Angeles", label: copy.businessHoursTimezoneLosAngeles },
];
```

Replace toast and validation strings:
- `toast.error("설정을 불러오지 못했습니다.")` → `toast.error(copy.businessHoursLoadFailed)`
- `toast.error("휴일 이름과 날짜를 입력해 주세요.")` → `toast.error(copy.businessHoursHolidayRequired)`
- `toast.error("최소 하나 이상의 근무일을 선택해 주세요.")` → `toast.error(copy.businessHoursWorkDayRequired)`
- `toast.success("영업시간 설정이 저장되었습니다.")` → `toast.success(copy.businessHoursSaveSuccess)`
- `toast.error("저장에 실패했습니다. 다시 시도해 주세요.")` → `toast.error(copy.businessHoursSaveFailed)`

Note: `DAY_LABELS` and `TIMEZONES` must be moved **inside** the component function so `copy` is in scope.

- [ ] **Step 2: Wire `branding-form.tsx`**

- `toast.error("파일 업로드에 실패했습니다.")` → `toast.error(copy.brandingUploadFailed)`
- `toast.success("브랜딩 설정이 저장되었습니다.")` → `toast.success(copy.brandingSaveSuccess)`
- `toast.error("브랜딩 설정 저장에 실패했습니다.")` → `toast.error(copy.brandingSaveFailed)`
- `placeholder="회사명을 입력하세요"` → `placeholder={copy.brandingCompanyPlaceholder}`
- Default value `"민원 티켓을 생성하고 상태를 바로 조회할 수 있습니다."` → `copy.brandingDescPlaceholder` (used as `placeholder` or default)
- `placeholder="고객 지원 센터"` → `placeholder={copy.brandingAppTitlePlaceholder}`
- `placeholder="무엇을 도와드릴까요?"` → `placeholder={copy.brandingAdminTitlePlaceholder}`
- `"클릭하여 업로드"` (both logo + favicon) → `{copy.commonUploadClick}`
- `"설정 저장"` → `{copy.brandingSave}`

- [ ] **Step 3: Wire `email-settings-form.tsx`**

- `toast.success("이메일 설정이 저장되었습니다.")` → `toast.success(copy.emailSaveSuccess)`
- `toast.error("이메일 설정 저장에 실패했습니다.")` → `toast.error(copy.emailSaveFailed)`
- `"비밀번호 입력"` → `{copy.emailPasswordPlaceholder}` (used as placeholder)
- `"Secret Key 입력"` → `{copy.emailSecretPlaceholder}`
- `"설정 저장"` → `{copy.emailSaveButton}`

- [ ] **Step 4: Wire `llm-settings-form.tsx`**

- `"Ollama 서버가 응답했습니다."` → `copy.llmOllamaSuccess`
- `"Ollama 서버에 접근할 수 없습니다."` → `copy.llmOllamaFailed`
- `"설정 저장"` → `{copy.llmSaveButton}`
- The LLM prompt placeholder text (the Korean prompt example) — **keep as-is** (this is functional LLM content)

- [ ] **Step 5: Wire `system-management.tsx`**

Replace `BACKUP_SECTIONS` array:
```typescript
const BACKUP_SECTIONS = [
  copy.systemDataTickets,
  copy.systemDataAgents,
  copy.systemDataSettings,
  copy.systemDataKnowledge,
  copy.systemDataAuditLogs,
];
```
Move inside component function if currently a module-level const.

Replace strings:
- `throw new Error("백업 실패")` → `throw new Error(copy.systemBackupFailed)`
- `toast.success("백업 파일이 다운로드되었습니다.")` → `toast.success(copy.systemBackupSuccess)`
- `+ (err instanceof Error ? err.message : "오류")` — the "오류" fallback → `copy.commonError`
- `throw new Error(json.error ?? "복구 실패")` → `throw new Error(json.error ?? copy.systemRestoreError)`
- `toast.warning("스키마 버전이 다릅니다...")` → `toast.warning(copy.systemRestoreSchemaWarning)`
- `toast.success("복구가 완료되었습니다. 로그인 화면으로 이동합니다.")` → `toast.success(copy.systemRestoreSuccess)`
- `throw new Error(json.error ?? "초기화 실패")` → `throw new Error(json.error ?? copy.systemResetFailed)`
- `toast.success("초기화가 완료되었습니다.")` → `toast.success(copy.systemResetSuccess)`
- `placeholder="초기화"` → `placeholder={copy.systemResetConfirmPlaceholder}`
- `disabled={confirmText !== "초기화"}` → `disabled={confirmText !== copy.systemResetConfirmPlaceholder}`
- `"백업 다운로드"` → `{copy.systemBackupDownload}`
- `"복구 시작"` → `{copy.systemRestoreStart}`
- `"초기화"` (reset button) → `{copy.systemResetButton}`

- [ ] **Step 6: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/admin/business-hours-form.tsx apps/admin/src/components/admin/branding-form.tsx apps/admin/src/components/admin/email-settings-form.tsx apps/admin/src/components/admin/llm-settings-form.tsx apps/admin/src/components/admin/system-management.tsx
git commit -m "feat(i18n): wire basic settings forms (business hours, branding, email, LLM, system)"
```

---

## Task 10: Advanced settings — git, webhooks, API keys, request types, custom fields

**Files:**
- Modify: `apps/admin/src/components/admin/git-settings.tsx`
- Modify: `apps/admin/src/components/admin/api-key-manager.tsx`
- Modify: `apps/admin/src/components/admin/webhook-endpoint-manager.tsx`
- Modify: `apps/admin/src/components/admin/request-type-list.tsx`
- Modify: `apps/admin/src/components/admin/custom-field-dialog.tsx`
- Modify: `apps/admin/src/components/admin/custom-field-list.tsx`

For each: add `useAdminCopy` import + `const copy = useAdminCopy()`.

- [ ] **Step 1: Wire `git-settings.tsx`**

- `description: "프라이빗 리포지토리 접근을 위해 'repo' 스코프가 필요합니다."` → `description: copy.gitRepoScopeNote`
- `toast.error("프로바이더와 토큰을 입력해주세요")` → `toast.error(copy.gitProviderTokenRequired)`
- `|| "저장에 실패했습니다"` → `|| copy.gitSaveFailed`
- `toast.error(... "오류가 발생했습니다")` → `toast.error(copy.gitSaveError)`
- `throw new Error("삭제에 실패했습니다")` → `throw new Error(copy.gitDeleteFailed)`
- `toast.success("자격증명이 삭제되었습니다")` → `toast.success(copy.gitDeleteSuccess)`
- `toast.error("삭제에 실패했습니다")` → `toast.error(copy.gitDeleteError)`
- `{existing ? "연결됨" : "미연결"}` → `{existing ? copy.gitConnected : copy.gitDisconnected}`
- `{isSubmitting ? "저장 중..." : "저장"}` → `{isSubmitting ? copy.commonSaving : copy.commonSave}`

- [ ] **Step 2: Wire `api-key-manager.tsx`**

- `마지막 사용: ${...}` → replace the label part: change `마지막 사용` string to `copy.gitApiKeyLastUsed`
  ```tsx
  {copy.gitApiKeyLastUsed}: {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString(...) : copy.commonNone}
  ```
- `aria-label="키 이름"` → `aria-label={copy.apiKeyNameAriaLabel}`

- [ ] **Step 3: Wire `webhook-endpoint-manager.tsx`**

Replace `WEBHOOK_EVENTS` array:
```typescript
const WEBHOOK_EVENTS = [
  { id: "ticket.created",   label: copy.webhookEventTicketCreated },
  { id: "ticket.updated",   label: copy.webhookEventTicketUpdated },
  { id: "ticket.commented", label: copy.webhookEventTicketCommented },
];
```
Move inside component.

Replace strings:
- `toast.success("테스트 webhook을 발송했습니다.")` → `toast.success(copy.webhookTestSuccess)`
- `... "테스트 webhook 발송에 실패했습니다."` → `copy.webhookTestFailed`
- `마지막 호출: ${...}` → `{copy.webhookLastTriggered}: ${...}`
- `{testingId === webhook.id ? "전송 중..." : "테스트 발송"}` → `{testingId === webhook.id ? copy.commonSending : copy.commonSendTest}`
- `응답 코드: ${...}` → `{copy.webhookResponseCode}: ${...}`
- `?? "없음"` → `?? copy.webhookNone`

- [ ] **Step 4: Wire `request-type-list.tsx`**

- `|| "저장에 실패했습니다"` → `|| copy.requestTypeSaveSuccess` (check — save success vs save failed)
  - Actually `throw new Error(error.message || "저장에 실패했습니다")` — this is error, not success → `|| copy.requestTypeError`
- `toast.success("수정되었습니다")` → `toast.success(copy.requestTypeSaveSuccess)`
- `toast.success("생성되었습니다")` → `toast.success(copy.requestTypeUpdateSuccess)`
- `throw new Error("상태 변경에 실패했습니다")` → `throw new Error(copy.requestTypeStatusFailed)`
- `toast.error(... "오류가 발생했습니다")` → `toast.error(copy.requestTypeError)`
- `throw new Error("삭제에 실패했습니다")` → `throw new Error(copy.requestTypeDeleteFailed)`
- `toast.success("삭제되었습니다")` → `toast.success(copy.requestTypeDeleteSuccess)`
- `submitLabel="생성"` → `submitLabel={copy.requestTypeCreateButton}`
- `submitLabel="저장"` → `submitLabel={copy.requestTypeSaveButton}`
- `placeholder="문의 유형에 대한 설명"` → `placeholder={copy.requestTypeDescriptionPlaceholder}`
- `placeholder="팀 선택"` → `placeholder={copy.requestTypeTeamPlaceholder}`
- `"아니오"` (inactive display) → `{copy.requestTypeInactive}`
- `"비활성화되었습니다"` (status change toast) → `copy.teamsDeactivateSuccess` (reuse)

- [ ] **Step 5: Wire `custom-field-dialog.tsx`**

- `newErrors.key = "키는 필수입니다."` → `newErrors.key = copy.customFieldKeyRequired`
- `newErrors.key = "키는 영문, 숫자, 언더스코어만 사용 가능합니다."` → `newErrors.key = copy.customFieldKeyInvalid`
- `newErrors.name = "이름은 필수입니다."` → `newErrors.name = copy.customFieldNameRequired`
- `newErrors.options = "옵션은 필수입니다."` → `newErrors.options = copy.customFieldOptionsRequired`
- `{field ? "커스텀 필드 수정" : "새 커스텀 필드"}` → `{field ? copy.customFieldEditTitle : copy.customFieldNewTitle}`
- `placeholder="예: order_id, product_type"` → `placeholder={copy.customFieldKeyExamplePlaceholder}`
- `placeholder="예: 주문 번호, 제품 유형"` → `placeholder={copy.customFieldNamePlaceholder}`
- `placeholder="옵션1, 옵션2, 옵션3 (쉼표로 구분)"` → `placeholder={copy.customFieldOptionPlaceholder}`
- `placeholder="필드에 대한 추가 설명"` → `placeholder={copy.customFieldDescriptionPlaceholder}`
- `{field ? "수정" : "생성"}` → `{field ? copy.commonEdit : copy.commonCreate}`

- [ ] **Step 6: Wire `custom-field-list.tsx`**

Replace `FIELD_TYPE_LABELS` map:
```typescript
const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: copy.customFieldTypeText,
  NUMBER: copy.customFieldTypeNumber,
  DATE: copy.customFieldTypeDate,
  BOOLEAN: copy.customFieldTypeBoolean,
  SELECT: copy.customFieldTypeSelect,
  MULTI_SELECT: copy.customFieldTypeMultiSelect,
};
```
Move inside component.

Replace toasts:
- `toast.success(editingField ? "필드가 수정되었습니다." : "필드가 생성되었습니다.")` → `toast.success(editingField ? copy.commonSuccess : copy.customFieldSaveSuccess)`
- `toast.error("저장 중 오류가 발생했습니다.")` → `toast.error(copy.customFieldSaveError)`
- `toast.success(isActive ? "필드가 활성화되었습니다." : "필드가 비활성화되었습니다.")` → `toast.success(isActive ? copy.customFieldActivateSuccess : copy.customFieldDeactivateSuccess)`
- `toast.error("상태 변경 중 오류가 발생했습니다.")` → `toast.error(copy.customFieldStatusError)`
- `confirm("이 필드를 삭제하시겠습니까?")` — browser confirm, leave as-is (no copy hook in JS expression)
- `toast.success("필드가 삭제되었습니다.")` → `toast.success(copy.customFieldDeleteSuccess)`
- `toast.error("삭제 중 오류가 발생했습니다.")` → `toast.error(copy.customFieldDeleteError)`

- [ ] **Step 7: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/admin/git-settings.tsx apps/admin/src/components/admin/api-key-manager.tsx apps/admin/src/components/admin/webhook-endpoint-manager.tsx apps/admin/src/components/admin/request-type-list.tsx apps/admin/src/components/admin/custom-field-dialog.tsx apps/admin/src/components/admin/custom-field-list.tsx
git commit -m "feat(i18n): wire git, webhooks, API keys, request types, custom fields"
```

---

## Task 11: Complex settings — SLA, automation, SAML

**Files:**
- Modify: `apps/admin/src/components/admin/sla-policy-manager.tsx`
- Modify: `apps/admin/src/components/admin/automation-rule-manager.tsx`
- Modify: `apps/admin/src/components/admin/saml-provider-form.tsx`

For each: add `useAdminCopy` import + `const copy = useAdminCopy()`.

- [ ] **Step 1: Wire `sla-policy-manager.tsx`**

- `toast.success(policy.isActive ? "정책이 비활성화되었습니다." : "정책이 활성화되었습니다.")` → `toast.success(policy.isActive ? copy.slaPolicyDeactivateSuccess : copy.slaPolicyActivateSuccess)`
- `window.confirm("이 SLA 정책을 삭제하시겠습니까?")` — leave as-is (browser confirm)
- `{policy.isActive ? "활성" : "비활성"}` → `{policy.isActive ? copy.slaPolicyActive : copy.slaPolicyInactive}`
- `{policy.description || "설명 없음"}` → `{policy.description || copy.slaPolicyNoDescription}`
- `label="우선순위"` → `label={copy.slaPolicyPriority}`
- `label="첫 응답"` → `label={copy.slaPolicyFirstResponse}`
- `label="해결 목표"` → `label={copy.slaPolicyResolution}`
- `{policy.isActive ? "운영중" : "중지됨"}` → `{policy.isActive ? copy.slaPolicyRunning : copy.slaPolicyStopped}`
- `{isSaving ? "저장 중..." : "저장"}` → `{isSaving ? copy.slaPolicySaving : copy.commonSave}`

- [ ] **Step 2: Wire `automation-rule-manager.tsx`**

- `toast.error("자동화 규칙을 불러오지 못했습니다.")` → `toast.error(copy.automationLoadFailed)`
- `toast.error("자동화 규칙 저장에 실패했습니다.")` → `toast.error(copy.automationSaveFailed)`
- `"자동화 규칙이 생성되었습니다."` → `copy.automationCreateSuccess`
- `"규칙이 활성화되었습니다."` → `copy.automationActivateSuccess`
- `toast.error("자동화 규칙 상태 변경에 실패했습니다.")` → `toast.error(copy.automationStatusFailed)`
- `window.confirm("이 자동화 규칙을 삭제하시겠습니까?")` — leave as-is
- `toast.success("자동화 규칙이 삭제되었습니다.")` → `toast.success(copy.automationDeleteSuccess)`
- `toast.error("자동화 규칙 삭제에 실패했습니다.")` → `toast.error(copy.automationDeleteFailed)`
- `{rule.description || "설명 없음"}` → `{rule.description || copy.automationNoDescription}`
- `title="조건"` → `title={copy.automationConditions}`
- `title="동작"` → `title={copy.automationActions}`
- `"비활성"` (badge) → `{copy.commonInactive}`
- All `aria-label="..."` strings → use `copy.automation*AriaLabel` keys
- `result.push("담당자 해제")` → `result.push(copy.automationUnassign)`

- [ ] **Step 3: Wire `saml-provider-form.tsx`**

Read the file for Korean strings:
```bash
grep -n '"[가-힣]' apps/admin/src/components/admin/saml-provider-form.tsx
```
Then replace each with the appropriate copy key. The two keys already defined are:
- `copy.samlMetaDownloadSuccess` → for "메타데이터 파일이 다운로드되었습니다"
- `copy.samlMetaDownloadFailed` → for download failure

For other strings in SAML form (field labels, instructions, button text), read the file and add any missing keys to AdminCopy first if needed, then replace.

- [ ] **Step 4: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/admin/sla-policy-manager.tsx apps/admin/src/components/admin/automation-rule-manager.tsx apps/admin/src/components/admin/saml-provider-form.tsx
git commit -m "feat(i18n): wire SLA, automation rules, SAML form"
```

---

## Task 12: Chat widget settings and profiles

**Files:**
- Modify: `apps/admin/src/components/admin/chat-widget-settings-manager.tsx`
- Modify: `apps/admin/src/components/admin/chat-widget-profile-manager.tsx`
- Modify: `apps/admin/src/components/admin/chat-saved-views-bar.tsx`

For each: add `useAdminCopy` import + `const copy = useAdminCopy()`.

- [ ] **Step 1: Wire `chat-widget-settings-manager.tsx`**

Replace all 29 Korean strings using `copy.chatWidget*` keys defined in Task 1.

Key mappings:
- `"채팅 위젯 설정을 불러오지 못했습니다."` → `copy.chatWidgetLoadFailed`
- `"채팅 위젯 설정이 저장되었습니다."` → `copy.chatWidgetSaveSuccess`
- `"채팅 위젯 설정 저장에 실패했습니다."` → `copy.chatWidgetSaveFailed`
- `"플로팅 채팅 버튼 활성화"` → `copy.chatWidgetFloatingEnable`
- `"미읽음 배지 표시"` → `copy.chatWidgetBadgeShow`
- `"배지 색상"` → `copy.chatWidgetBadgeColor`
- etc. for all `chatWidget*` keys

- [ ] **Step 2: Wire `chat-widget-profile-manager.tsx`**

Replace all 33 Korean strings using `copy.chatProfile*` keys.

- `"프로필 추가"` → `copy.chatProfileAdd`
- `"프로필 이름"` → `copy.chatProfileName`
- `"버튼 이미지를 업로드했습니다."` (profile) → `copy.chatProfileButtonImageSuccess`
- etc.

- [ ] **Step 3: Wire `chat-saved-views-bar.tsx`**

- `"채팅 보기 이름"` → `copy.chatViewName`
- `"채팅 보기가 저장되었습니다."` → `copy.chatViewSaveSuccess`
- `"채팅 보기가 삭제되었습니다."` → `copy.chatViewDeleteSuccess`
- `"채팅 보기 저장에 실패했습니다."` → wait — check — actually it's `"보기 저장에 실패했습니다."` → `copy.chatViewSaveFailed`
- `"보기 삭제에 실패했습니다."` → `copy.chatViewDeleteFailed`
- `"보기 이름을 입력해주세요."` → `copy.chatViewNameRequired`

- [ ] **Step 4: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/admin/chat-widget-settings-manager.tsx apps/admin/src/components/admin/chat-widget-profile-manager.tsx apps/admin/src/components/admin/chat-saved-views-bar.tsx
git commit -m "feat(i18n): wire chat widget settings and profile manager"
```

---

## Task 13: Admin ticket/* components

**Files:**
- Modify: `apps/admin/src/components/ticket/comment-list.tsx`
- Modify: `apps/admin/src/components/ticket/customer-reply-form.tsx`
- Modify: `apps/admin/src/components/ticket/git-integration-section.tsx`
- Modify: `apps/admin/src/components/ticket/ticket-form.tsx`

For each: add `useAdminCopy` import + `const copy = useAdminCopy()`.

- [ ] **Step 1: Wire `comment-list.tsx`**

- `{isCustomer ? "고객" : comment.author?.name || "상담원"}` → `{isCustomer ? copy.commentAuthorCustomer : comment.author?.name || copy.commentAuthorAgent}`
- `{isCustomer ? "작성자" : "상담원"}` → `{isCustomer ? copy.commentRoleCustomer : copy.commentRoleAgent}`

- [ ] **Step 2: Wire `customer-reply-form.tsx`**

- `data.error || "답변 등록에 실패했습니다."` → `data.error || copy.customerReplyFailed`
- `"오류가 발생했습니다. 다시 시도해주세요."` → `copy.customerReplyError`
- `placeholder="추가로 문의하실 내용을 입력해주세요."` → `placeholder={copy.customerReplyPlaceholder}`
- `{isLoading ? "전송 중..." : "전송"}` → `{isLoading ? copy.commonSending : copy.commonSend}`

- [ ] **Step 3: Wire `git-integration-section.tsx`**

- `|| "이슈 연결에 실패했습니다."` → `|| copy.gitIssueLinkFailed`
- `payload.error || "연결 해제에 실패했습니다."` → `payload.error || copy.gitIssueUnlinkFailed`
- `toast.success("이슈 연결이 해제됐습니다.")` → `toast.success(copy.gitIssueUnlinkSuccess)`
- `|| "이슈 검색에 실패했습니다."` → `|| copy.gitIssueSearchFailed`
- `... "이슈 검색에 실패했습니다."` (catch) → `copy.gitIssueSearchError`
- `|| "이슈 생성에 실패했습니다."` → `|| copy.gitIssueCreateFailed`
- `... "이슈 생성에 실패했습니다."` (catch) → `copy.gitIssueCreateError`
- `placeholder="이슈 검색어"` → `placeholder={copy.gitIssueSearchPlaceholder}`
- `{isSearching ? "검색 중..." : "이슈 검색"}` → `{isSearching ? copy.gitIssueSearchLoading : copy.gitIssueSearchButton}`
- `{isCreating ? "생성 중..." : "새 이슈 생성"}` → `{isCreating ? copy.gitIssueCreateLoading : copy.gitIssueCreateButton}`

- [ ] **Step 4: Wire `ticket-form.tsx`**

- `|| "티켓 생성에 실패했습니다."` → `|| copy.ticketFormCreateFailed`
- `... "알 수 없는 오류가 발생했습니다."` → `copy.ticketFormUnknownError`
- `placeholder="홍길동"` — **keep as-is** (Korean name format example)
- `placeholder="회사명 또는 소속 기관"` → `placeholder={copy.ticketFormOrgPlaceholder}`
- `placeholder="문의 제목을 입력해주세요"` → `placeholder={copy.ticketFormSubjectPlaceholder}`
- `placeholder="문의 내용을 상세히 입력해주세요 (최소 20자)"` → `placeholder={copy.ticketFormBodyPlaceholder}`
- `"티켓 제출"` → `{copy.ticketFormSubmit}`

- [ ] **Step 5: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/ticket/comment-list.tsx apps/admin/src/components/ticket/customer-reply-form.tsx apps/admin/src/components/ticket/git-integration-section.tsx apps/admin/src/components/ticket/ticket-form.tsx
git commit -m "feat(i18n): wire admin ticket/* components"
```

---

## Task 14: Remaining components — filters, operations, analytics

**Files:**
- Modify: `apps/admin/src/components/admin/saved-filters.tsx`
- Modify: `apps/admin/src/components/admin/advanced-search.tsx`
- Modify: `apps/admin/src/components/admin/helpdesk-operations-center.tsx`
- Modify: `apps/admin/src/components/admin/analytics/` (check for Korean strings)

For each: add `useAdminCopy` import + `const copy = useAdminCopy()`.

- [ ] **Step 1: Wire `saved-filters.tsx`**

- `toast.error("필터 이름을 입력해주세요.")` → `toast.error(copy.savedFilterNameRequired)`
- `toast.success("필터가 저장되었습니다.")` → `toast.success(copy.savedFilterSaveSuccess)`
- `toast.error("저장 중 오류가 발생했습니다.")` → `toast.error(copy.savedFilterSaveError)`
- `confirm(...)` — leave as-is
- `toast.success("필터가 삭제되었습니다.")` → `toast.success(copy.savedFilterDeleteSuccess)`
- `toast.error("삭제 중 오류가 발생했습니다.")` → `toast.error(copy.savedFilterDeleteError)`
- `placeholder="필터 이름"` → `placeholder={copy.savedFilterNamePlaceholder}`
- `{isLoading ? "저장 중..." : "저장"}` → `{isLoading ? copy.savedFilterSaving : copy.commonSave}`

- [ ] **Step 2: Wire `advanced-search.tsx`**

- `placeholder="검색어를 입력하세요..."` → `placeholder={copy.advancedSearchPlaceholder}`
- `{saved.mode === "all" && "모두"}` → `{saved.mode === "all" && copy.advancedSearchAll}`
- `{saved.mode === "any" && "하나라도"}` → `{saved.mode === "any" && copy.advancedSearchAny}`
- `{saved.mode === "exact" && "정확"}` → `{saved.mode === "exact" && copy.advancedSearchExact}`

- [ ] **Step 3: Wire `helpdesk-operations-center.tsx`**

- `title="응답 목표"` → `title={copy.helpdeskSlaTitle}`
- `description="문의별 응답/해결..."` → `description={copy.helpdeskSlaDescription}`
- `title="자동 처리"` → `title={copy.helpdeskAutoTitle}`
- `description="반복되는 분류..."` → `description={copy.helpdeskAutoDescription}`
- `title="작업 바로가기"` → `title={copy.helpdeskShortcutsTitle}`
- `description="상담원이 자주 보는..."` → `description={copy.helpdeskShortcutsDescription}`

- [ ] **Step 4: Check analytics directory**

```bash
grep -rn '"[가-힣]' apps/admin/src/components/admin/analytics/ --include="*.tsx" 2>/dev/null | head -20
```

Wire any Korean strings found using appropriate `copy.analytics*` keys.

- [ ] **Step 5: Build check + Commit**

```bash
pnpm --filter=@suppo/admin build 2>&1 | tail -20
git add apps/admin/src/components/admin/saved-filters.tsx apps/admin/src/components/admin/advanced-search.tsx apps/admin/src/components/admin/helpdesk-operations-center.tsx
git commit -m "feat(i18n): wire saved filters, advanced search, operations center"
```

---

## Task 15: Chat workspace components + final verification

**Files:**
- Modify: `apps/admin/src/components/admin/chat-workspace.tsx` (if needed)
- Verify: full build passes

- [ ] **Step 1: Check remaining components for missed Korean strings**

```bash
grep -rn '"[가-힣]' apps/admin/src/components/ --include="*.tsx" | grep -v "node_modules" | wc -l
```

Expected: significantly reduced count. Any remaining strings should be:
- Example data strings (OK to keep)
- API body values (OK to keep)
- Strings in non-client components without `useAdminCopy` access

- [ ] **Step 2: Wire chat-workspace.tsx if it has Korean strings**

```bash
grep -n '"[가-힣]' apps/admin/src/components/admin/chat-workspace.tsx
```

Apply same pattern: add `useAdminCopy` + replace strings.

Also check:
```bash
grep -n '"[가-힣]' apps/admin/src/components/admin/chat-queue.tsx
```

- [ ] **Step 3: Final full build**

```bash
cd /Users/pjw/dev/project/suppo-helpdesk
pnpm build:admin 2>&1 | tail -40
```

Expected: build succeeds with zero TypeScript errors.

- [ ] **Step 4: Smoke test**

```bash
pnpm dev:admin
```

1. Open `http://localhost:3001/admin/dashboard`
2. Click the language toggle button in the sidebar
3. Verify page reloads with English labels
4. Click again to return to Korean
5. Verify Korean labels restore correctly

- [ ] **Step 5: Final commit**

```bash
git add -p  # stage any remaining changes
git commit -m "feat(i18n): complete admin console KO/EN language switching"
```

---

## Summary of Files Changed

**Shared package:**
- `packages/shared/src/i18n/admin-copy.ts` — ~250 new keys added

**Navigation:**
- `apps/admin/src/lib/navigation/admin-nav.ts` — rewritten to use AdminCopy labels
- `apps/admin/src/components/admin-shell.tsx` — pass copy to getAdminNavSections

**Admin components (~30 files):**
- `ticket-list.tsx`, `ticket-filters.tsx`
- `ticket-detail.tsx`, `ticket-detail-extended.tsx`, `ticket-workspace-summary.tsx`, `ticket-relations-panel.tsx`
- `comment-section.tsx`, `comment-thread.tsx`, `internal-note-form.tsx`, `ticket-merge-dialog.tsx`, `transfer-dialog.tsx`
- `agent-list.tsx`
- `team-list.tsx`, `customer-list.tsx`, `customer-snapshot-card.tsx`, `customer-insights-panel.tsx`, `audit-log-list.tsx`
- `knowledge-list.tsx`, `knowledge-form.tsx`, `template-form.tsx`, `template-list.tsx`, `category-manager.tsx`, `ticket-knowledge-links.tsx`
- `business-hours-form.tsx`, `branding-form.tsx`, `email-settings-form.tsx`, `llm-settings-form.tsx`, `system-management.tsx`
- `git-settings.tsx`, `api-key-manager.tsx`, `webhook-endpoint-manager.tsx`, `request-type-list.tsx`, `custom-field-dialog.tsx`, `custom-field-list.tsx`
- `sla-policy-manager.tsx`, `automation-rule-manager.tsx`, `saml-provider-form.tsx`
- `chat-widget-settings-manager.tsx`, `chat-widget-profile-manager.tsx`, `chat-saved-views-bar.tsx`
- `saved-filters.tsx`, `advanced-search.tsx`, `helpdesk-operations-center.tsx`

**Admin ticket/* components:**
- `apps/admin/src/components/ticket/comment-list.tsx`, `customer-reply-form.tsx`, `git-integration-section.tsx`, `ticket-form.tsx`
