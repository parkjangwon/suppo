function isIpAddress(hostname: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function isPrivateHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  if (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    !normalized.includes(".")
  ) {
    return true;
  }

  if (isIpAddress(normalized)) {
    return isPrivateIpv4(normalized);
  }

  return false;
}

export function validateWebhookTargetUrl(
  url: string,
  options: { allowPrivateHosts?: boolean } = {}
): { valid: true } | { valid: false; error: string } {
  const allowPrivateHosts = options.allowPrivateHosts ?? process.env.NODE_ENV !== "production";
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "유효한 URL을 입력해주세요." };
  }

  const privateHost = isPrivateHost(parsed.hostname);

  if (parsed.protocol !== "https:") {
    if (allowPrivateHosts && privateHost && parsed.protocol === "http:") {
      return { valid: true };
    }
    return { valid: false, error: "Webhook URL은 https만 허용됩니다." };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: "Webhook URL에 사용자 정보를 포함할 수 없습니다." };
  }

  if (!allowPrivateHosts && privateHost) {
    return { valid: false, error: "내부망/로컬 주소는 Webhook 대상으로 사용할 수 없습니다." };
  }

  return { valid: true };
}
