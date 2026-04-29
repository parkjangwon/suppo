const DEFAULT_PUBLIC_URL = "http://localhost:3000";
const DEFAULT_ADMIN_URL = "http://localhost:3001";

function normalizeUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getPublicAppUrl(configuredUrl?: string): string {
  const baseUrl =
    configuredUrl ??
    process.env.PUBLIC_URL ??
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    DEFAULT_PUBLIC_URL;

  return normalizeUrl(baseUrl);
}

export function getAdminAppUrl(configuredUrl?: string): string {
  const baseUrl =
    configuredUrl ??
    process.env.ADMIN_BASE_URL ??
    process.env.ADMIN_URL ??
    process.env.NEXT_PUBLIC_ADMIN_URL ??
    process.env.PUBLIC_URL ??
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    DEFAULT_ADMIN_URL;

  return normalizeUrl(baseUrl);
}

export function createPublicTicketUrl(ticketNumber: string, configuredUrl?: string): string {
  return `${getPublicAppUrl(configuredUrl)}/ticket/${ticketNumber}`;
}

export function createAdminTicketSearchUrl(ticketNumber: string, configuredUrl?: string): string {
  return `${getAdminAppUrl(configuredUrl)}/admin/tickets?q=${encodeURIComponent(ticketNumber)}`;
}

export function createAdminTicketDetailUrl(ticketId: string, configuredUrl?: string): string {
  return `${getAdminAppUrl(configuredUrl)}/admin/tickets/${ticketId}`;
}

export function createPublicSurveyUrl(ticketId: string, configuredUrl?: string): string {
  return `${getPublicAppUrl(configuredUrl)}/survey/${ticketId}`;
}

export function createPublicKnowledgeUrl(slug: string, configuredUrl?: string): string {
  return `${getPublicAppUrl(configuredUrl)}/knowledge/${slug}`;
}

export function createSamlMetadataBaseUrl(configuredUrl?: string): string {
  return getPublicAppUrl(configuredUrl);
}
