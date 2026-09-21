import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyApplicantToken } from "@/lib/auth/applicant-token";

const MAX_PAYLOAD_BYTES = 50 * 1024; // 50 KB
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Constant-time secret comparison to prevent timing attacks.
 */
function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf-8");
    const bufB = Buffer.from(b, "utf-8");
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Safely extracts a string from either a direct string or a single-element array (such as from Google Sheets e.namedValues).
 */
function extractString(val: unknown): string | null {
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
    const trimmed = val[0].trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

/**
 * Normalizes multi-value input (array or comma-separated string) into a clean string array.
 */
function normalizeArray(input: unknown, maxItems = 50): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .map((item) => (item as string).trim())
      .slice(0, maxItems);
  }
  if (typeof input === "string") {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, maxItems);
  }
  return [];
}

export async function POST(request: NextRequest) {
  // 1. Authenticate webhook secret
  const configuredSecret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET;
  if (!configuredSecret) {
    console.error("[Webhook Error] GOOGLE_FORMS_WEBHOOK_SECRET is not configured on server.");
    return NextResponse.json(
      { error: "Internal Server Configuration Error" },
      { status: 500 }
    );
  }

  const incomingSecret =
    request.headers.get("x-tutr-webhook-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!incomingSecret || !secureCompare(incomingSecret, configuredSecret)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing webhook secret." },
      { status: 401 }
    );
  }

  // 2. Validate Content-Type
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Unsupported Media Type: Request must be application/json." },
      { status: 415 }
    );
  }

  // 3. Read and check payload size
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Bad Request: Unable to read request stream." },
      { status: 400 }
    );
  }

  if (Buffer.byteLength(rawBody, "utf-8") > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Payload Too Large: Maximum allowed size is 50KB." },
      { status: 413 }
    );
  }

  // 4. Parse JSON safely
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Payload must be a JSON object.");
    }
  } catch {
    return NextResponse.json(
      { error: "Bad Request: Malformed JSON payload." },
      { status: 400 }
    );
  }

  // 5. Explicit schema validation & sanitization
  // Required fields: google_response_id, full_name, email
  const googleResponseId =
    extractString(payload.google_response_id) ||
    extractString(payload.response_id) ||
    extractString(payload["Response ID"]);

  if (!googleResponseId || googleResponseId.length > 255) {
    return NextResponse.json(
      { error: "Validation Error: google_response_id is required (1-255 characters)." },
      { status: 400 }
    );
  }

  const fullName =
    extractString(payload.full_name) ||
    extractString(payload.name) ||
    extractString(payload["Full Name"]);

  if (!fullName || fullName.length > 255) {
    return NextResponse.json(
      { error: "Validation Error: full_name is required (1-255 characters)." },
      { status: 400 }
    );
  }

  const rawEmail =
    extractString(payload.email) ||
    extractString(payload["Email Address"]) ||
    extractString(payload["Email"]);

  if (!rawEmail || !EMAIL_REGEX.test(rawEmail) || rawEmail.length > 255) {
    return NextResponse.json(
      { error: "Validation Error: A valid email address is required (max 255 characters)." },
      { status: 400 }
    );
  }
  const normalizedEmail = rawEmail.toLowerCase();

  // Helper: check if a string represents a file URL or Google Drive link
  const isDocumentUrl = (val: string): boolean => {
    const trimmed = val.trim().toLowerCase();
    return (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.includes("drive.google.com") ||
      trimmed.includes("docs.google.com")
    );
  };

  // Helper: extracts document URLs from multiple possible formats (string, array, comma/newline separated)
  const extractDocumentUrls = (raw: unknown): string[] => {
    if (!raw) return [];
    const candidates: string[] = [];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === "string") {
          // URLs might be separated by commas, newlines, or spaces
          const parts = item.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean);
          candidates.push(...parts);
        }
      }
    } else if (typeof raw === "string") {
      const parts = raw.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean);
      candidates.push(...parts);
    }

    // Filter valid URLs and deduplicate
    const validUrls = Array.from(
      new Set(
        candidates.filter((url) => isDocumentUrl(url))
      )
    ).slice(0, 20); // reasonable upper bound

    return validUrls;
  };

  // Optional string fields with length limits (supports array-wrapped values from Google Sheets)
  const phone = (
    extractString(payload.phone) ||
    extractString(payload["Phone Number"]) ||
    extractString(payload["WhatsApp"])
  )?.slice(0, 50);

  const location = (
    extractString(payload.location) ||
    extractString(payload["Preferred Locality"]) ||
    extractString(payload["Location"]) ||
    extractString(payload["Address"])
  )?.slice(0, 500);

  // Teaching Experience
  const experience = (
    extractString(payload.experience) ||
    extractString(payload["Teaching Experience"]) ||
    extractString(payload["Experience"])
  )?.slice(0, 1000);

  // Scan all payload keys for potential document upload questions
  // Google Forms question: "Upload Qualification/Identity Documents"
  let rawDocumentInput: unknown =
    payload.documents ||
    payload["Upload Qualification/Identity Documents"] ||
    payload["Upload Qualification / Identity Documents"] ||
    payload["Upload Qualification/Identity Document"] ||
    payload["Qualification/Identity Documents"] ||
    payload["Identity Documents"] ||
    payload["Documents"] ||
    payload["Certificates"] ||
    payload["Resume"];

  if (!rawDocumentInput) {
    for (const key of Object.keys(payload)) {
      const lowerKey = key.toLowerCase().trim();
      if (
        (lowerKey.includes("upload") && lowerKey.includes("document")) ||
        (lowerKey.includes("identity") && lowerKey.includes("document")) ||
        lowerKey.includes("certificate") ||
        lowerKey.includes("resume") ||
        lowerKey.includes("cv")
      ) {
        rawDocumentInput = payload[key];
        break;
      }
    }
  }

  const extractedDocs = extractDocumentUrls(rawDocumentInput);

  // Educational Qualification:
  // Must NOT contain URLs. If payload.qualification contains a URL (due to buggy upstream Apps Script),
  // route that URL to documents and discard it from qualification.
  let rawQual =
    extractString(payload["Educational Qualification"]) ||
    extractString(payload["Qualification"]) ||
    extractString(payload.qualification);

  if (rawQual && isDocumentUrl(rawQual)) {
    console.warn(
      `[Webhook Field Guard] Document URL detected in qualification field: "${rawQual}". Redirecting to documents.`
    );
    if (!extractedDocs.includes(rawQual)) {
      extractedDocs.push(rawQual);
    }
    rawQual = null;
  }

  const qualification = rawQual?.slice(0, 500) || null;

  const fee = (
    extractString(payload.fee) ||
    extractString(payload["Expected Fee"]) ||
    extractString(payload["Fee"])
  )?.slice(0, 200);

  const availability = (
    extractString(payload.availability) ||
    extractString(payload["Weekly Availability"]) ||
    extractString(payload["Availability"])
  )?.slice(0, 500);

  // Applicant Identity Token Handling (Three-state model)
  // State A: No token present -> Legacy submission. Ingestion falls back to email matching.
  // State B: Token present and valid -> Verified UUID passed. Authoritative identity.
  // State C: Token present but invalid/expired/tampered -> REJECT. Do not silently fallback to email.
  let rawToken =
    extractString(payload.applicant_token) ||
    extractString(payload.user_token) ||
    extractString(payload.tutr_token) ||
    extractString(payload["Applicant Token"]) ||
    extractString(payload["Tutr Token"]) ||
    extractString(payload["Tutr Applicant ID"]) ||
    extractString(payload["User ID"]);

  if (!rawToken) {
    for (const key of Object.keys(payload)) {
      const lk = key.toLowerCase().trim();
      if (lk.includes("token") || (lk.includes("applicant") && lk.includes("id"))) {
        rawToken = extractString(payload[key]);
        if (rawToken) break;
      }
    }
  }

  let verifiedUserId: string | null = null;
  if (rawToken) {
    const verification = verifyApplicantToken(rawToken);
    if (!verification.isValid) {
      console.warn(
        `[Webhook Security Guard] Rejected application submission with invalid applicant token. Reason: ${verification.errorReason}. ResponseId: ${googleResponseId}`
      );
      return NextResponse.json(
        {
          error:
            "Security Validation Error: The provided applicant authentication token is invalid or has expired. Please launch the application form directly from your logged-in Tutr account.",
        },
        { status: 400 }
      );
    }
    verifiedUserId = verification.userId;
  }

  // Normalized arrays (supports array or comma-separated string)
  const subjects = normalizeArray(payload.subjects || payload["Subjects Taught"] || payload["Subjects"]);
  const classes = normalizeArray(payload.classes || payload["Target Classes"] || payload["Classes"]);
  const boards = normalizeArray(payload.boards || payload["Target Boards"] || payload["Boards"]);
  const documents = extractedDocs;

  // Note: Caller-provided review fields ('status', 'reviewed_at', 'reviewed_by', 'rejection_reason', 'is_verified')
  // are completely ignored and stripped from processing to protect review integrity.

  try {
    const supabaseAdmin = createAdminClient();

    // Call privileged stored procedure (14 parameters)
    const { data, error } = await supabaseAdmin.rpc("ingest_google_form_application", {
      p_google_response_id: googleResponseId,
      p_full_name: fullName,
      p_email: normalizedEmail,
      p_phone: phone || undefined,
      p_location: location || undefined,
      p_qualification: qualification || undefined,
      p_experience: experience || undefined,
      p_fee: fee || undefined,
      p_availability: availability || undefined,
      p_subjects: subjects,
      p_classes: classes,
      p_boards: boards,
      p_documents: documents,
      p_user_id: verifiedUserId || undefined,
    });

    if (error) {
      console.error("[Webhook Database Error]", error.message);
      return NextResponse.json(
        { error: "Failed to process application ingestion." },
        { status: 500 }
      );
    }

    const result = (data as unknown) as {
      id: string;
      action: "created" | "updated" | "locked";
      status: string;
      user_id?: string | null;
    };

    // Safe operational logging (no PII or secrets)
    console.log(
      `[Google Forms Webhook] Success. ResponseId: ${googleResponseId}, Action: ${result.action}`
    );

    const httpStatus = result.action === "created" ? 201 : 200;
    return NextResponse.json(
      {
        success: true,
        action: result.action,
        application_id: result.id,
        status: result.status,
      },
      { status: httpStatus }
    );
  } catch (err) {
    console.error("[Webhook Unexpected Error]", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: "Internal Server Error during ingestion." },
      { status: 500 }
    );
  }
}
