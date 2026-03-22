import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function resolveEncryptionKey(): Buffer {
  const rawKey = process.env.GIT_TOKEN_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("GIT_TOKEN_ENCRYPTION_KEY is not configured");
  }

  const trimmed = rawKey.trim();

  const tryHex = () => {
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, "hex");
    }
    return null;
  };

  const tryBase64 = () => {
    try {
      const decoded = Buffer.from(trimmed, "base64");
      return decoded.length === 32 ? decoded : null;
    } catch {
      return null;
    }
  };

  const key = tryHex() ?? tryBase64() ?? Buffer.from(trimmed, "utf8");

  if (key.length !== 32) {
    throw new Error("GIT_TOKEN_ENCRYPTION_KEY must be 32 bytes (utf8/base64/hex)");
  }

  return key;
}

export function encryptToken(plainText: string): string {
  const key = resolveEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(payload: string): string {
  const [version, ivB64, tagB64, encryptedB64] = payload.split(":");

  if (version !== "v1" || !ivB64 || !tagB64 || !encryptedB64) {
    throw new Error("Invalid encrypted token payload");
  }

  const key = resolveEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}
