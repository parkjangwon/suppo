import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/index";

export interface SAMLProfile {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  domain?: string;
  rawAttributes?: Record<string, unknown>;
}

export default function BoxyHQSAML(
  options: OAuthUserConfig<SAMLProfile>
): OAuthConfig<SAMLProfile> {
  const { clientId, clientSecret, issuer } = options;

  return {
    id: "boxyhq-saml",
    name: "BoxyHQ SAML",
    type: "oauth",
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: "openid email profile",
      },
    },
    checks: ["pkce", "state"],
    clientId,
    clientSecret,
    profile(profile) {
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.name || profile.email,
        firstName: profile.given_name,
        lastName: profile.family_name,
        domain: profile.domain || profile.email?.split("@")[1],
        rawAttributes: profile.rawAttributes || {},
      };
    },
    options,
  };
}
