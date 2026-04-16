import { getPublicAppUrl as getSharedPublicAppUrl } from "./app-urls";

export function getPublicAppUrl(configuredUrl?: string): string {
  return getSharedPublicAppUrl(configuredUrl);
}

export function createPublicKnowledgeUrl(slug: string, configuredUrl?: string): string {
  return `${getPublicAppUrl(configuredUrl)}/knowledge/${slug}`;
}
