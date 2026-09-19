import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * Server-side Razorpay Client & Cryptographic Signature Verifier.
 * Strictly server-side: NEVER import or execute this in client components!
 */
export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Missing Razorpay credentials. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in .env.local."
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Cryptographically verifies Razorpay payment checkout signature using HMAC-SHA256.
 * Signature payload: `${order_id}|${payment_id}`
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret?: string;
}): boolean {
  const secret = params.secret || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    throw new Error("Missing RAZORPAY_KEY_SECRET for signature verification.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const signatureBuf = Buffer.from(params.signature, "utf-8");
    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * Cryptographically verifies Razorpay webhook signature using HMAC-SHA256.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Missing RAZORPAY_WEBHOOK_SECRET for webhook verification.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch {
    return false;
  }
}

export interface UnlockedContactsResponse {
  unlocked: boolean;
  connection_id: string;
  status: string;
  tutor?: {
    full_name: string;
    phone: string;
    email: string;
    locality?: string | null;
  } | null;
  student?: {
    full_name: string;
    phone?: string | null;
    email: string;
  } | null;
}
