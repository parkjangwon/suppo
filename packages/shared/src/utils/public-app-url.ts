const DEFAULT_PUBLIC_APP_URL = "http://localhost:3000";

export function getPublicAppUrl(configuredUrl?: string): string {
  const baseUrl = configuredUrl ?? process.env.PUBLIC_URL ?? DEFAULT_PUBLIC_APP_URL;

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function createPublicKnowledgeUrl(slug: string, configuredUrl?: string): string {
  return `${getPublicAppUrl(configuredUrl)}/knowledge/${slug}`;
}
