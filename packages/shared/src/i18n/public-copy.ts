export type PublicLocale = "ko" | "en";

export interface PublicCopy {
  locale: PublicLocale;
  navKnowledge: string;
  navNewTicket: string;
  navLookupTicket: string;
  footerSupport: string;
  footerQuickLinks: string;
  footerHomepage: string;
  footerHome: string;
  homeKnowledgeCta: string;
  homeNewTicketCta: string;
  homeLookupTicketCta: string;
  homeFeatureKnowledgeTitle: string;
  homeFeatureKnowledgeDescription: string;
  homeFeatureNewTicketTitle: string;
  homeFeatureNewTicketDescription: string;
  homeFeatureLookupTitle: string;
  homeFeatureLookupDescription: string;
  newTicketTitle: string;
  newTicketDescription: string;
  ticketLookupTitle: string;
  ticketLookupDescription: string;
  formName: string;
  formEmail: string;
  formPhone: string;
  formOrganization: string;
  formRequestType: string;
  formPriority: string;
  formSubject: string;
  formDescription: string;
  formAttachments: string;
  formTicketNumber: string;
  formSubmit: string;
  formSubmitting: string;
  formPlaceholders: {
    name: string;
    email: string;
    phone: string;
    organization: string;
    requestType: string;
    subject: string;
    description: string;
    ticketNumber: string;
    lookupEmail: string;
  };
  lookupButton: string;
  lookupLoading: string;
  lookupNotFound: string;
  lookupRetry: string;
  priorities: Record<"LOW" | "MEDIUM" | "HIGH" | "URGENT", string>;
  // Knowledge base - index page
  knowledgePageTitle: string;
  knowledgePageDescription: string;
  knowledgeHeading: string;
  knowledgeSubheading: string;
  knowledgeSearchPlaceholder: string;
  knowledgeSearchButton: string;
  knowledgeCategories: string;
  knowledgeCategoryAll: string;
  knowledgeFilterSearchLabel: string;
  knowledgeFilterCategoryLabel: string;
  knowledgeResultCountSuffix: string;
  knowledgeSearchResultsPrefix: string;
  knowledgeSearchResultsSuffix: string;
  knowledgeNoResults: string;
  knowledgeNoResultsSubtext: string;
  knowledgeContactViaTicket: string;
  knowledgePopularArticles: string;
  knowledgeNoArticles: string;
  knowledgeViewCountPrefix: string;
  knowledgeFooterCtaBefore: string;
  knowledgeFooterCtaLink: string;
  knowledgeFooterCtaAfter: string;
  // Knowledge base - article page
  knowledgeArticleNotFound: string;
  knowledgeBackToList: string;
  knowledgeArticleHelpfulQuestion: string;
  knowledgeNoAnswerFound: string;
  knowledgeCreateTicketAction: string;
  knowledgeRelatedArticles: string;
  knowledgeNoRelatedArticles: string;
  knowledgeContactTitle: string;
  knowledgeContactText: string;
  knowledgeContactTicketButton: string;
  // Article feedback
  knowledgeFeedbackHelpful: string;
  knowledgeFeedbackNotHelpful: string;
  knowledgeFeedbackThanks: string;
}

const PUBLIC_COPY: Record<PublicLocale, PublicCopy> = {
  ko: {
    locale: "ko",
    navKnowledge: "지식 찾기",
    navNewTicket: "티켓 작성",
    navLookupTicket: "티켓 조회",
    footerSupport: "고객 지원",
    footerQuickLinks: "바로가기",
    footerHomepage: "홈페이지",
    footerHome: "홈",
    homeKnowledgeCta: "지식 찾기",
    homeNewTicketCta: "티켓 작성",
    homeLookupTicketCta: "티켓 조회",
    homeFeatureKnowledgeTitle: "지식 찾기",
    homeFeatureKnowledgeDescription: "자주 묻는 질문과 도움말을 검색하여 즉시 해결하세요.",
    homeFeatureNewTicketTitle: "간편한 문의",
    homeFeatureNewTicketDescription: "몇 가지 정보만 입력하면 빠르게 문의를 등록할 수 있습니다.",
    homeFeatureLookupTitle: "실시간 조회",
    homeFeatureLookupDescription: "티켓 번호로 언제 어디서나 문의 상태를 확인하세요.",
    newTicketTitle: "문의하기",
    newTicketDescription: "궁금한 점이나 문제가 있으신가요? 아래 양식을 작성해 주시면 신속하게 답변해 드리겠습니다.",
    ticketLookupTitle: "티켓 조회",
    ticketLookupDescription: "티켓 번호와 이메일을 입력하여 문의 내역을 확인하세요.",
    formName: "이름",
    formEmail: "이메일",
    formPhone: "전화번호",
    formOrganization: "소속/회사",
    formRequestType: "문의 유형",
    formPriority: "우선순위",
    formSubject: "제목",
    formDescription: "내용",
    formAttachments: "첨부파일",
    formTicketNumber: "티켓 번호",
    formSubmit: "티켓 제출",
    formSubmitting: "제출 중...",
    formPlaceholders: {
      name: "홍길동",
      email: "hong@example.com",
      phone: "010-1234-5678",
      organization: "회사명 또는 소속 기관",
      requestType: "선택해주세요",
      subject: "문의 제목을 입력해주세요",
      description: "문의 내용을 상세히 입력해주세요 (최소 20자)",
      ticketNumber: "CRN-XXXXXXXXXX",
      lookupEmail: "customer@example.com",
    },
    lookupButton: "조회",
    lookupLoading: "조회 중...",
    lookupNotFound: "일치하는 티켓을 찾을 수 없습니다",
    lookupRetry: "오류가 발생했습니다. 다시 시도해주세요.",
    priorities: {
      LOW: "낮음",
      MEDIUM: "보통",
      HIGH: "높음",
      URGENT: "긴급",
    },
    knowledgePageTitle: "지식 찾기 | Suppo",
    knowledgePageDescription: "자주 묻는 질문과 도움말을 찾아보세요",
    knowledgeHeading: "무엇을 도와드릴까요?",
    knowledgeSubheading: "자주 묻는 질문과 도움말을 검색하세요",
    knowledgeSearchPlaceholder: "제목, 내용으로 검색...",
    knowledgeSearchButton: "검색",
    knowledgeCategories: "카테고리",
    knowledgeCategoryAll: "전체",
    knowledgeFilterSearchLabel: "검색:",
    knowledgeFilterCategoryLabel: "카테고리:",
    knowledgeResultCountSuffix: "건",
    knowledgeSearchResultsPrefix: "",
    knowledgeSearchResultsSuffix: " 검색 결과",
    knowledgeNoResults: "검색 결과가 없습니다",
    knowledgeNoResultsSubtext: "다른 검색어나 카테고리를 시도해보세요.",
    knowledgeContactViaTicket: "티켓으로 문의하기 →",
    knowledgePopularArticles: "인기 문서",
    knowledgeNoArticles: "아직 게시된 문서가 없습니다.",
    knowledgeViewCountPrefix: "조회 ",
    knowledgeFooterCtaBefore: "원하는 내용을 찾지 못하셨나요? ",
    knowledgeFooterCtaLink: "티켓을 생성",
    knowledgeFooterCtaAfter: "하여 문의해 주세요.",
    knowledgeArticleNotFound: "문서를 찾을 수 없습니다",
    knowledgeBackToList: "지식 목록으로",
    knowledgeArticleHelpfulQuestion: "이 문서가 도움이 되었나요?",
    knowledgeNoAnswerFound: "원하는 답변을 찾지 못하셨나요?",
    knowledgeCreateTicketAction: "티켓 생성하기",
    knowledgeRelatedArticles: "관련 문서",
    knowledgeNoRelatedArticles: "관련 문서가 없습니다",
    knowledgeContactTitle: "문의하기",
    knowledgeContactText: "추가 도움이 필요하시면 언제든지 문의해 주세요.",
    knowledgeContactTicketButton: "티켓 생성",
    knowledgeFeedbackHelpful: "도움이 되었어요",
    knowledgeFeedbackNotHelpful: "도움이 필요해요",
    knowledgeFeedbackThanks: "피드백을 보내주셔서 감사합니다!",
  },
  en: {
    locale: "en",
    navKnowledge: "Knowledge Base",
    navNewTicket: "Submit Ticket",
    navLookupTicket: "Track Ticket",
    footerSupport: "Support",
    footerQuickLinks: "Quick Links",
    footerHomepage: "Website",
    footerHome: "Home",
    homeKnowledgeCta: "Browse knowledge",
    homeNewTicketCta: "Submit ticket",
    homeLookupTicketCta: "Track ticket",
    homeFeatureKnowledgeTitle: "Find answers",
    homeFeatureKnowledgeDescription: "Search FAQs and guides to resolve issues instantly.",
    homeFeatureNewTicketTitle: "Fast request",
    homeFeatureNewTicketDescription: "Send a support request quickly with just a few details.",
    homeFeatureLookupTitle: "Track in real time",
    homeFeatureLookupDescription: "Check your ticket status anytime with your ticket number.",
    newTicketTitle: "Contact support",
    newTicketDescription: "Have a question or issue? Fill out the form below and our team will respond quickly.",
    ticketLookupTitle: "Track your ticket",
    ticketLookupDescription: "Enter your ticket number and email to check the latest status.",
    formName: "Name",
    formEmail: "Email",
    formPhone: "Phone",
    formOrganization: "Organization",
    formRequestType: "Request type",
    formPriority: "Priority",
    formSubject: "Subject",
    formDescription: "Description",
    formAttachments: "Attachments",
    formTicketNumber: "Ticket number",
    formSubmit: "Submit ticket",
    formSubmitting: "Submitting...",
    formPlaceholders: {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "+82 10-1234-5678",
      organization: "Company or organization",
      requestType: "Please select",
      subject: "Enter a short summary of your issue",
      description: "Describe your issue in detail (minimum 20 characters)",
      ticketNumber: "CRN-XXXXXXXXXX",
      lookupEmail: "customer@example.com",
    },
    lookupButton: "Track ticket",
    lookupLoading: "Looking up...",
    lookupNotFound: "We could not find a matching ticket.",
    lookupRetry: "Something went wrong. Please try again.",
    priorities: {
      LOW: "Low",
      MEDIUM: "Medium",
      HIGH: "High",
      URGENT: "Urgent",
    },
    knowledgePageTitle: "Knowledge Base | Suppo",
    knowledgePageDescription: "Find answers to frequently asked questions and help guides",
    knowledgeHeading: "How can we help you?",
    knowledgeSubheading: "Search our FAQs and help guides",
    knowledgeSearchPlaceholder: "Search by title or content...",
    knowledgeSearchButton: "Search",
    knowledgeCategories: "Categories",
    knowledgeCategoryAll: "All",
    knowledgeFilterSearchLabel: "Search:",
    knowledgeFilterCategoryLabel: "Category:",
    knowledgeResultCountSuffix: " results",
    knowledgeSearchResultsPrefix: "Search results for ",
    knowledgeSearchResultsSuffix: "",
    knowledgeNoResults: "No results found",
    knowledgeNoResultsSubtext: "Try different keywords or categories.",
    knowledgeContactViaTicket: "Contact via ticket →",
    knowledgePopularArticles: "Popular articles",
    knowledgeNoArticles: "No published articles yet.",
    knowledgeViewCountPrefix: "",
    knowledgeFooterCtaBefore: "Couldn't find what you were looking for? ",
    knowledgeFooterCtaLink: "Create a ticket",
    knowledgeFooterCtaAfter: " to get in touch.",
    knowledgeArticleNotFound: "Article not found",
    knowledgeBackToList: "Back to knowledge base",
    knowledgeArticleHelpfulQuestion: "Was this article helpful?",
    knowledgeNoAnswerFound: "Couldn't find the answer you were looking for?",
    knowledgeCreateTicketAction: "Create a ticket",
    knowledgeRelatedArticles: "Related articles",
    knowledgeNoRelatedArticles: "No related articles",
    knowledgeContactTitle: "Contact us",
    knowledgeContactText: "Need more help? Our team is here for you.",
    knowledgeContactTicketButton: "Create ticket",
    knowledgeFeedbackHelpful: "Yes, helpful",
    knowledgeFeedbackNotHelpful: "Not helpful",
    knowledgeFeedbackThanks: "Thank you for your feedback!",
  },
};

export function normalizePublicLocale(value: string | null | undefined): PublicLocale {
  return value === "en" ? "en" : "ko";
}

export function getPublicCopy(locale: string | null | undefined): PublicCopy {
  return PUBLIC_COPY[normalizePublicLocale(locale)];
}
