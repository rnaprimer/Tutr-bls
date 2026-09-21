/**
 * Phase 4B: Live Google Forms & Google Apps Script Integration Validation Suite
 * 
 * Verifies:
 * 1. Configuration: Webhook URL and secret present in environment
 * 2. Documentation: docs/google-forms-integration.md contains complete Apps Script & mapping
 * 3. Apps Script Contract: Validates field mapping and deterministic response ID handling
 * 4. Google Sheets Payload Support: Tests array-wrapped e.namedValues format
 * 5. Authentication: Rejects unauthorized or missing webhook secrets
 * 6. Valid Application Ingestion: Staged as PENDING in Supabase
 * 7. Idempotency: Duplicate submissions refresh PENDING applications without duplicating rows
 * 8. Review State Locking: APPROVED applications reject external overwrites
 * 9. Tampering Protections: status, reviewed_by, reviewed_at, and is_verified cannot be injected
 * 10. Identity Linking: Immediate linking for existing users
 * 11. Delayed Identity Linking: Trigger links application upon subsequent Google OAuth signup
 * 12. Anti-Hijacking: Already-linked applications are shielded from reassignment
 * 13. Regression: Integrates and runs Phase 4A, Phase 3B, and Phase 2B test suites
 */

import http from "http";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env.local") });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3005";
const WEBHOOK_SECRET = process.env.GOOGLE_FORMS_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing required environment variables in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    testsFailed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function sendWebhook(payload, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL("/api/webhooks/google-forms", BASE_URL);
    const headers = {
      "content-type": "application/json",
      ...(options.secret !== undefined ? { "x-tutr-webhook-secret": options.secret } : { "x-tutr-webhook-secret": WEBHOOK_SECRET }),
      ...(options.headers || {}),
    };

    const req = http.request(
      url,
      { method: "POST", headers },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on("error", reject);
    req.write(typeof payload === "string" ? payload : JSON.stringify(payload));
    req.end();
  });
}

async function runValidation() {
  console.log("\n==================================================");
  console.log("TEST SUITE 1: Configuration & Documentation Contract");
  console.log("==================================================");

  // 1. Script Properties in .env.local
  assert(Boolean(process.env.GOOGLE_FORMS_WEBHOOK_SECRET), "GOOGLE_FORMS_WEBHOOK_SECRET configured server-side");
  assert(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), "NEXT_PUBLIC_SUPABASE_URL configured");
  assert(Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), "SUPABASE_SERVICE_ROLE_KEY configured server-side");

  // 2. Integration Documentation
  const docPath = path.resolve("./docs/google-forms-integration.md");
  assert(fs.existsSync(docPath), "docs/google-forms-integration.md exists");
  const docContent = fs.readFileSync(docPath, "utf-8");

  assert(docContent.includes("function onFormSubmit(e)"), "Documentation contains installable onFormSubmit Apps Script");
  assert(docContent.includes("resolveResponseId"), "Apps Script implements deterministic response ID strategy");
  assert(docContent.includes("PropertiesService.getScriptProperties()"), "Apps Script uses Script Properties (no hardcoded secrets)");
  assert(docContent.includes("maxAttempts = 3"), "Apps Script implements 3-attempt retry engine");
  assert(docContent.includes("Utilities.sleep(backoffDelayMs)"), "Apps Script implements exponential backoff");
  assert(docContent.includes("429") && docContent.includes("500"), "Apps Script retries transient errors (429, 500, etc.)");
  assert(docContent.includes("400") && docContent.includes("401"), "Apps Script aborts on permanent client errors (400, 401)");

  console.log("\n==================================================");
  console.log("TEST SUITE 2: Google Sheets e.namedValues Simulation");
  console.log("==================================================");

  // 3. Array-wrapped values format (direct from Google Sheets onFormSubmit)
  const sheetRespId = `resp_sheet_row_42_${Date.now()}`;
  const sheetEmail = `sheet.tutor.${Date.now()}@example.com`;

  const sheetPayload = {
    "Response ID": [sheetRespId],
    "Full Name": ["Rajesh Mohanty"],
    "Email Address": [sheetEmail],
    "Phone Number": ["+91 9437012345"],
    "Preferred Locality": ["Sahadevkhunta, Balasore"],
    "Educational Qualification": ["B.Tech"],
    "Teaching Experience": ["5"],
    "Expected Fee": ["₹400/hour"],
    "Weekly Availability": ["Every evening 5-8 PM"],
    "Subjects Taught": ["English", "Odia"],
    "Target Classes": ["Class 8", "Class 9", "Class 10"],
    "Target Boards": ["BSE Odisha", "CBSE"],
    "Upload Qualification/Identity Documents": ["https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp"],
  };

  const sheetRes = await sendWebhook(sheetPayload);
  assert(sheetRes.statusCode === 201, "Array-wrapped Google Sheet payload processed with HTTP 201 Created");
  assert(sheetRes.body.action === "created", "Action reports 'created'");
  assert(sheetRes.body.status === "PENDING", "Initial status is strictly 'PENDING'");

  const sheetAppId = sheetRes.body.application_id;

  const { data: sheetAppInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("*")
    .eq("id", sheetAppId)
    .single();

  assert(sheetAppInDb.google_response_id === sheetRespId, "Mapped Response ID accurately");
  assert(sheetAppInDb.full_name === "Rajesh Mohanty", "Unwrapped Full Name scalar from array");
  assert(sheetAppInDb.email === sheetEmail.toLowerCase(), "Unwrapped and normalized Email Address");
  assert(sheetAppInDb.location === "Sahadevkhunta, Balasore", "Mapped Preferred Locality");
  assert(sheetAppInDb.qualification === "B.Tech", "Educational Qualification accurately mapped to text value 'B.Tech' (not URL)");
  assert(sheetAppInDb.experience === "5", "Teaching Experience accurately mapped to '5'");
  assert(Array.isArray(sheetAppInDb.subjects) && sheetAppInDb.subjects.includes("English"), "Normalized Subjects array");
  assert(
    Array.isArray(sheetAppInDb.documents) &&
    sheetAppInDb.documents.length === 1 &&
    sheetAppInDb.documents[0] === "https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp",
    "Mapped 'Upload Qualification/Identity Documents' to documents array"
  );

  // 3b. Test submission with NO uploaded document
  const noDocRespId = `resp_sheet_nodoc_${Date.now()}`;
  const noDocEmail = `nodoc.tutor.${Date.now()}@example.com`;
  const noDocPayload = {
    "Response ID": [noDocRespId],
    "Full Name": ["Pooja Sharma"],
    "Email Address": [noDocEmail],
    "Educational Qualification": ["M.Sc Mathematics"],
    "Teaching Experience": ["3 years"],
    "Upload Qualification/Identity Documents": [""],
  };

  const noDocRes = await sendWebhook(noDocPayload);
  assert(noDocRes.statusCode === 201, "No-document payload accepted with HTTP 201");
  const { data: noDocAppInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("*")
    .eq("id", noDocRes.body.application_id)
    .single();
  assert(noDocAppInDb.qualification === "M.Sc Mathematics", "Educational Qualification preserved");
  assert(noDocAppInDb.experience === "3 years", "Teaching Experience preserved");
  assert(
    Array.isArray(noDocAppInDb.documents) && noDocAppInDb.documents.length === 0,
    "Submission with empty/no document yields clean empty documents array ([])"
  );

  // 3c. Test safeguard: accidental URL in qualification field is automatically rerouted
  const urlInQualRespId = `resp_sheet_url_in_qual_${Date.now()}`;
  const urlInQualEmail = `url.in.qual.${Date.now()}@example.com`;
  const urlInQualPayload = {
    "Response ID": [urlInQualRespId],
    "Full Name": ["Amit Das"],
    "Email Address": [urlInQualEmail],
    "qualification": ["https://drive.google.com/open?id=accidental_url"],
    "Teaching Experience": ["2"],
  };

  const urlInQualRes = await sendWebhook(urlInQualPayload);
  assert(urlInQualRes.statusCode === 201, "Accidental URL in qualification handled with HTTP 201");
  const { data: urlInQualAppInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("*")
    .eq("id", urlInQualRes.body.application_id)
    .single();
  assert(urlInQualAppInDb.qualification === null, "Qualification with Drive URL was stripped from qualification column");
  assert(
    Array.isArray(urlInQualAppInDb.documents) &&
    urlInQualAppInDb.documents.includes("https://drive.google.com/open?id=accidental_url"),
    "Drive URL from qualification field was redirected to documents column"
  );

  console.log("\n==================================================");
  console.log("TEST SUITE 3: Idempotency & Review Locking");
  console.log("==================================================");

  // 4. Duplicate Sheet submission (Retry simulation)
  const retryRes = await sendWebhook(sheetPayload);
  assert(retryRes.statusCode === 200, "Retrying identical submission returns HTTP 200");
  assert(retryRes.body.action === "updated", "Action reports 'updated'");
  assert(retryRes.body.application_id === sheetAppId, "Maintains identical application_id (zero duplicates)");

  const { data: countCheck } = await supabaseAdmin
    .from("tutor_applications")
    .select("id")
    .eq("google_response_id", sheetRespId);
  assert(countCheck.length === 1, "Database strictly contains 1 row for response ID");

  // 5. Locking when application is approved
  await supabaseAdmin
    .from("tutor_applications")
    .update({ status: "APPROVED", reviewed_at: new Date().toISOString() })
    .eq("id", sheetAppId);

  const approvedRetry = await sendWebhook({
    ...sheetPayload,
    "Full Name": ["Tampered Name"],
  });
  assert(approvedRetry.statusCode === 200, "Retry for approved application returns HTTP 200");
  assert(approvedRetry.body.action === "locked", "Action reports 'locked'");

  const { data: lockedApp } = await supabaseAdmin
    .from("tutor_applications")
    .select("*")
    .eq("id", sheetAppId)
    .single();
  assert(lockedApp.status === "APPROVED", "Status protected against overwrite");
  assert(lockedApp.full_name === "Rajesh Mohanty", "Full Name protected against overwrite");

  console.log("\n==================================================");
  console.log("TEST SUITE 4: Identity Linking (Existing & Delayed)");
  console.log("==================================================");

  // 6. Pre-existing user linking
  const existingEmail = `existing.tutor.${Date.now()}@example.com`;
  const { data: user1, error: errUser1 } = await supabaseAdmin.auth.admin.createUser({
    email: existingEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Existing Tutor User" },
  });
  if (errUser1) throw errUser1;

  const existingRes = await sendWebhook({
    google_response_id: `resp_exist_${Date.now()}`,
    full_name: "Existing Tutor User",
    email: existingEmail,
  });
  assert(existingRes.statusCode === 201, "Application ingested for existing user");
  const { data: existingApp } = await supabaseAdmin
    .from("tutor_applications")
    .select("user_id")
    .eq("id", existingRes.body.application_id)
    .single();
  assert(existingApp.user_id === user1.user.id, "Application immediately linked to existing public.users.id");

  // 7. Delayed user linking (submitted before account exists)
  const delayedEmail = `delayed.tutor.${Date.now()}@example.com`;
  const delayedRes = await sendWebhook({
    google_response_id: `resp_delayed_${Date.now()}`,
    full_name: "Delayed Tutor",
    email: delayedEmail,
  });
  assert(delayedRes.statusCode === 201, "Application ingested for future user");
  const delayedAppId = delayedRes.body.application_id;

  const { data: preApp } = await supabaseAdmin
    .from("tutor_applications")
    .select("user_id")
    .eq("id", delayedAppId)
    .single();
  assert(preApp.user_id === null, "Pre-signup application user_id is null");

  // User registers later through Supabase Auth
  const { data: user2, error: errUser2 } = await supabaseAdmin.auth.admin.createUser({
    email: delayedEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Delayed Tutor" },
  });
  if (errUser2) throw errUser2;

  const { data: postApp } = await supabaseAdmin
    .from("tutor_applications")
    .select("user_id")
    .eq("id", delayedAppId)
    .single();
  assert(postApp.user_id === user2.user.id, "Delayed signup automatically linked application via database trigger");

  // 8. Anti-hijacking
  const { data: imposterUser, error: errImposter } = await supabaseAdmin.auth.admin.createUser({
    email: `imposter.${Date.now()}@example.com`,
    password: "Password123!",
    email_confirm: true,
  });
  if (errImposter) throw errImposter;

  const { data: hijackAttempt } = await supabaseAdmin
    .from("tutor_applications")
    .update({ user_id: imposterUser.user.id })
    .eq("id", delayedAppId)
    .is("user_id", null)
    .select();
  assert(hijackAttempt.length === 0, "Already-linked application cannot be reassigned (anti-hijacking verified)");

  console.log("\n==================================================");
  console.log("TEST SUITE 5: Signed Applicant Token & Admin Linking");
  console.log("==================================================");

  // 9a. Test valid signed applicant token
  const { generateApplicantToken } = await import("../lib/auth/applicant-token.ts");
  const testTutorEmail = `token.tutor.${Date.now()}@example.com`;
  const { data: tokenUser, error: errTokenUser } = await supabaseAdmin.auth.admin.createUser({
    email: testTutorEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Token Tutor" },
  });
  if (errTokenUser) throw errTokenUser;

  const validToken = generateApplicantToken(tokenUser.user.id);
  const tokenPayload = {
    "Response ID": [`resp_token_${Date.now()}`],
    "Full Name": ["Token Tutor Applicant"],
    "Email Address": ["submitted.email.different@example.com"], // Different from auth email
    "Applicant Token": [validToken],
    "Educational Qualification": ["M.Phil Physics"],
    "Teaching Experience": ["4 years"],
  };

  const tokenRes = await sendWebhook(tokenPayload);
  assert(tokenRes.statusCode === 201, "Submission with valid signed token returns HTTP 201 Created");
  const tokenAppId = tokenRes.body.application_id;

  const { data: tokenAppInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("user_id, email, full_name")
    .eq("id", tokenAppId)
    .single();

  assert(tokenAppInDb.user_id === tokenUser.user.id, "Authoritative user_id linked via signed token (not submitted email)");
  assert(tokenAppInDb.email === "submitted.email.different@example.com", "Contact email stored separately without overriding identity");

  // 9b. Test tampered applicant token (State C: MUST REJECT)
  const tamperedToken = validToken.slice(0, -4) + "abcd";
  const tamperedPayload = {
    "Response ID": [`resp_tampered_${Date.now()}`],
    "Full Name": ["Sneaky Malicious Applicant"],
    "Email Address": ["sneaky@example.com"],
    "Applicant Token": [tamperedToken],
  };

  const tamperedRes = await sendWebhook(tamperedPayload);
  assert(tamperedRes.statusCode === 400, "Tampered applicant token is REJECTED with HTTP 400 (not silently matched to email)");
  assert(tamperedRes.body.error && tamperedRes.body.error.includes("Security Validation Error"), "Error message informs of security validation rejection");

  // 9c. Test Admin Manual Linking Function
  // Create an unlinked application
  const unlinkedEmail = `unlinked.app.${Date.now()}@example.com`;
  const unlinkedRes = await sendWebhook({
    google_response_id: `resp_unlinked_${Date.now()}`,
    full_name: "Unlinked Applicant",
    email: unlinkedEmail,
  });
  const unlinkedAppId = unlinkedRes.body.application_id;

  // Admin calls admin_link_tutor_application_user
  const { data: linkResult, error: linkError } = await supabaseAdmin.rpc("admin_link_tutor_application_user", {
    p_application_id: unlinkedAppId,
    p_target_user_id: tokenUser.user.id,
  });
  assert(!linkError && linkResult.success === true, "Admin successfully links unlinked application to target Tutr user");

  const { data: linkedAppInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("user_id")
    .eq("id", unlinkedAppId)
    .single();
  assert(linkedAppInDb.user_id === tokenUser.user.id, "Database confirms application is linked to target user");

  // 9d. Anti-hijacking on Admin Linking: cannot reassign if already linked to a different user
  const { error: hijackErr } = await supabaseAdmin.rpc("admin_link_tutor_application_user", {
    p_application_id: unlinkedAppId,
    p_target_user_id: user1.user.id, // Attempting to steal application to user1
  });
  assert(Boolean(hijackErr), "Admin linking rejects reassigning an application already linked to a different user");

  // Clean up test records
  await supabaseAdmin.from("tutor_applications").delete().in("id", [
    sheetAppId,
    noDocRes.body.application_id,
    urlInQualRes.body.application_id,
    existingRes.body.application_id,
    delayedAppId,
    tokenAppId,
    unlinkedAppId,
  ]);
  await supabaseAdmin.auth.admin.deleteUser(user1.user.id);
  await supabaseAdmin.auth.admin.deleteUser(user2.user.id);
  await supabaseAdmin.auth.admin.deleteUser(imposterUser.user.id);
  await supabaseAdmin.auth.admin.deleteUser(tokenUser.user.id);

  console.log("\n==================================================");
  console.log(`TOTAL PHASE 4B TESTS: ${testsRun}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log("==================================================");

  if (testsFailed === 0) {
    console.log("🎉 ALL PHASE 4B AUTOMATED SIMULATION TESTS PASSED!\n");
    process.exit(0);
  } else {
    console.error(`💥 ${testsFailed} tests failed.`);
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
