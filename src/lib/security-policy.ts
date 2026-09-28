// 보안·무결성 중앙 정책 (하드코딩 제거용 단일 소스)
// 코드 내 매직넘버/문자열을 직접 쓰지 말고 여기서 import 할 것.
export const SECURITY_POLICY = {
  auth: {
    maxFails: 8,
    windowMs: 15 * 60 * 1000,
    bcryptRounds: 12,
    timingMinMs: 150,
    timingJitterMs: 150,
    sessionMaxAgeSec: 60 * 60 * 12,
  },
  pagination: {
    defaultLimit: 100,
    maxLimit: 500,
    defaultAllTake: 500,
  },
  upload: {
    specMaxBytes: 20 * 1024 * 1024,
    logoMaxBytes: 5 * 1024 * 1024,
    importMaxBytes: 10 * 1024 * 1024,
    importMaxRows: 2000,
    rawRowTake: 500,
    logoSize: 512,
    logoMaxPixels: 16_000_000,
  },
  notify: {
    fetchTimeoutMs: 15_000,
    maxRetry: 3,
    batchSize: 50,
    smsTitleMax: 80,
    smsMessageMax: 1000,
    smsDataMax: 2000,
  },
  douzone: {
    maxTargets: 200,
    fetchTimeoutMs: 15_000,
    responseMaxChars: 4000,
  },
  audit: {
    verifyLimit: 5000,
    errorChars: 500,
  },
  stats: {
    ttlMinutes: 5,
  },
} as const;

export const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "apiKey",
  "sms.apiKey",
  "douzone.apiKey",
  "email.apiKey",
  "token",
  "secret",
  "vapid",
]);

export function redactSensitiveDeep(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactSensitiveDeep);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      if (
        SENSITIVE_KEYS.has(k) ||
        lower.includes("password") ||
        lower.includes("apikey") ||
        lower.includes("secret") ||
        lower === "token"
      ) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactSensitiveDeep(v);
      }
    }
    return out;
  }
  return value;
}

const PHONE_RE = /^[0-9+\-() ]{8,20}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.trim());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
