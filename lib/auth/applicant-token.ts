import crypto from "crypto";

const TOKEN_PREFIX = "tutr_app_";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 7-day expiration provides a comfortable window for prospective tutors to fill out the form
const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function getSigningSecret(): string {
  const secret =
    process.env.APPLICANT_TOKEN_SECRET ||
    process.env.GOOGLE_FORMS_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "Missing APPLICANT_TOKEN_SECRET or GOOGLE_FORMS_WEBHOOK_SECRET for applicant token signing."
    );
  }
  return secret;
}

export interface VerifiedApplicantIdentity {
  isValid: boolean;
  userId: string | null;
  errorReason: "NONE" | "EXPIRED" | "TAMPERED" | "MALFORMED" | "SECRET_MISSING";
}

/**
 * Creates an HMAC-SHA256 signed applicant identity token containing the authenticated user's UUID.
 * Format: tutr_app_<base64url(userId:timestamp:expiresAt)>_<hex_hmac_16>
 */
export function generateApplicantToken(
  userId: string,
  expiresInMs: number = DEFAULT_EXPIRY_MS
): string {
  if (!userId || !UUID_REGEX.test(userId)) {
    throw new Error("Invalid userId supplied for applicant token generation.");
  }

  const now = Date.now();
  const exp = now + expiresInMs;
  const payload = `${userId}:${now}:${exp}`;
  const encodedPayload = Buffer.from(payload, "utf-8").toString("base64url");

  const secret = getSigningSecret();
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`${TOKEN_PREFIX}${encodedPayload}`)
    .digest("hex")
    .slice(0, 32); // 32 hex chars (128 bits) is compact and cryptographically robust

  return `${TOKEN_PREFIX}${encodedPayload}_${hmac}`;
}

/**
 * Verifies an applicant token and extracts the authenticated user's UUID.
 * Distinguishes:
 * - VALID
 * - EXPIRED
 * - TAMPERED
 * - MALFORMED
 */
export function verifyApplicantToken(token: unknown): VerifiedApplicantIdentity {
  if (typeof token !== "string") {
    return { isValid: false, userId: null, errorReason: "MALFORMED" };
  }

  const trimmed = token.trim();
  if (!trimmed.startsWith(TOKEN_PREFIX)) {
    return { isValid: false, userId: null, errorReason: "MALFORMED" };
  }

  const withoutPrefix = trimmed.slice(TOKEN_PREFIX.length);
  const lastUnderscore = withoutPrefix.lastIndexOf("_");
  if (lastUnderscore === -1) {
    return { isValid: false, userId: null, errorReason: "MALFORMED" };
  }

  const encodedPayload = withoutPrefix.slice(0, lastUnderscore);
  const incomingHmac = withoutPrefix.slice(lastUnderscore + 1);

  let secret: string;
  try {
    secret = getSigningSecret();
  } catch {
    return { isValid: false, userId: null, errorReason: "SECRET_MISSING" };
  }

  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(`${TOKEN_PREFIX}${encodedPayload}`)
    .digest("hex")
    .slice(0, 32);

  // Timing safe HMAC comparison
  try {
    const bufIncoming = Buffer.from(incomingHmac, "utf-8");
    const bufExpected = Buffer.from(expectedHmac, "utf-8");
    if (
      bufIncoming.length !== bufExpected.length ||
      !crypto.timingSafeEqual(bufIncoming, bufExpected)
    ) {
      return { isValid: false, userId: null, errorReason: "TAMPERED" };
    }
  } catch {
    return { isValid: false, userId: null, errorReason: "TAMPERED" };
  }

  // Parse decoded payload
  let decoded: string;
  try {
    decoded = Buffer.from(encodedPayload, "base64url").toString("utf-8");
  } catch {
    return { isValid: false, userId: null, errorReason: "MALFORMED" };
  }

  const parts = decoded.split(":");
  if (parts.length !== 3) {
    return { isValid: false, userId: null, errorReason: "MALFORMED" };
  }

  const [userId, , expStr] = parts;
  if (!UUID_REGEX.test(userId)) {
    return { isValid: false, userId: null, errorReason: "MALFORMED" };
  }

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Date.now() > exp) {
    return { isValid: false, userId: null, errorReason: "EXPIRED" };
  }

  return {
    isValid: true,
    userId,
    errorReason: "NONE",
  };
}
