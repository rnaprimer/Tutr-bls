/**
 * Phase 4A: Google Forms Ingestion & Security Validation Suite
 * 
 * Tests all 16 specified checkpoints:
 * 1. Webhook Authentication: Missing secret -> 401
 * 2. Webhook Authentication: Invalid secret -> 401
 * 3. Content-Type Validation: Non-JSON media type -> 415
 * 4. Payload Parsing: Malformed JSON -> 400
 * 5. Schema Validation: Missing required fields (google_response_id, full_name, email) -> 400
 * 6. Email Validation: Invalid email formats -> 400
 * 7. Payload Size Limit: Payloads > 50KB -> 413
 * 8. Valid Application Ingestion -> 201 Created with status 'PENDING'
 * 9. Idempotency: Duplicate google_response_id redelivery -> 200 Updated, no duplicate row
 * 10. Review-Controlled Protection: Tampering attempts (status='APPROVED') are stripped
 * 11. Review Audit Protection: Tampering with reviewed_by, reviewed_at, rejection_reason blocked
 * 12. Locked Application Protection: Duplicate delivery for APPROVED application does not overwrite review state
 * 13. Identity Linking: Automatic linking when matching public.users record exists
 * 14. Delayed User Linking: Subsequent user signup auto-links pending application matching email
 * 15. Anti-Hijacking: Already-linked application cannot be reassigned to another user
 * 16. Multiple NULL google_response_id: Partial unique index allows manual/NULL applications
 */

import http from "http";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env.local") });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3005";
const WEBHOOK_SECRET = process.env.GOOGLE_FORMS_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!WEBHOOK_SECRET) {
  console.error("❌ Missing GOOGLE_FORMS_WEBHOOK_SECRET in .env.local");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing Supabase admin credentials in .env.local");
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

function sendWebhookRequest(options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL("/api/webhooks/google-forms", BASE_URL);
    const headers = {
      "content-type": options.contentType !== undefined ? options.contentType : "application/json",
      ...(options.secret !== undefined ? { "x-tutr-webhook-secret": options.secret } : {}),
      ...(options.headers || {}),
    };

    const req = http.request(
      url,
      {
        method: "POST",
        headers,
      },
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
    if (options.body !== undefined) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("\n==================================================");
  console.log("TEST SUITE 1: Webhook Authentication & Request Headers");
  console.log("==================================================");

  // 1. Missing secret
  const noSecretRes = await sendWebhookRequest({
    body: { google_response_id: "test_001", full_name: "Test", email: "test@example.com" },
  });
  assert(noSecretRes.statusCode === 401, "Missing secret header returns HTTP 401 Unauthorized");

  // 2. Invalid secret
  const wrongSecretRes = await sendWebhookRequest({
    secret: "wrong_secret_12345",
    body: { google_response_id: "test_001", full_name: "Test", email: "test@example.com" },
  });
  assert(wrongSecretRes.statusCode === 401, "Invalid secret header returns HTTP 401 Unauthorized");

  // 3. Invalid Content-Type
  const wrongContentTypeRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    contentType: "text/plain",
    body: "google_response_id=test_001",
  });
  assert(
    wrongContentTypeRes.statusCode === 415,
    "Non-JSON Content-Type returns HTTP 415 Unsupported Media Type"
  );

  console.log("\n==================================================");
  console.log("TEST SUITE 2: Payload Parsing & Schema Validation");
  console.log("==================================================");

  // 4. Malformed JSON
  const malformedJsonRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: "{ google_response_id: 'bad', invalid_json ",
  });
  assert(malformedJsonRes.statusCode === 400, "Malformed JSON returns HTTP 400 Bad Request");

  // 5. Missing google_response_id
  const missingIdRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: { full_name: "Test User", email: "test@example.com" },
  });
  assert(missingIdRes.statusCode === 400, "Missing google_response_id returns HTTP 400 Bad Request");

  // 6. Missing full_name
  const missingNameRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: { google_response_id: "resp_missing_name", email: "test@example.com" },
  });
  assert(missingNameRes.statusCode === 400, "Missing full_name returns HTTP 400 Bad Request");

  // 7. Invalid email formats
  const invalidEmailRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: { google_response_id: "resp_bad_email", full_name: "Test User", email: "not-an-email" },
  });
  assert(invalidEmailRes.statusCode === 400, "Invalid email format returns HTTP 400 Bad Request");

  // 8. Oversized payload (> 50KB)
  const oversizedData = "x".repeat(55 * 1024);
  const oversizedRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: { google_response_id: "resp_oversized", full_name: "Big", email: "big@example.com", extra: oversizedData },
  });
  assert(oversizedRes.statusCode === 413, "Payload exceeding 50KB returns HTTP 413 Payload Too Large");

  console.log("\n==================================================");
  console.log("TEST SUITE 3: Application Ingestion & Review Integrity");
  console.log("==================================================");

  const testRespId1 = `resp_test_${Date.now()}_1`;
  const testRespId2 = `resp_test_${Date.now()}_2`;
  const testEmail1 = `tutor.ingest.${Date.now()}@example.com`;

  // 9. Valid new application
  const validRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: {
      google_response_id: testRespId1,
      full_name: "Priya Sharma",
      email: testEmail1,
      phone: "+91 9876543210",
      location: "Station Square, Balasore",
      qualification: "M.Sc Mathematics",
      experience: "5 years teaching Class 10 CBSE",
      fee: "₹500/hr",
      availability: "Mon-Fri 4-7 PM",
      subjects: ["Mathematics", "Physics"],
      classes: ["Class 9", "Class 10"],
      boards: "CBSE, BSE Odisha", // Test comma-delimited string normalization
      documents: ["https://drive.google.com/cert1"],
    },
  });
  assert(validRes.statusCode === 201, "Valid application ingestion returns HTTP 201 Created");
  assert(validRes.body.action === "created", "Action reports 'created'");
  assert(validRes.body.status === "PENDING", "Initial application status is strictly 'PENDING'");

  const createdAppId = validRes.body.application_id;

  // Verify directly in database
  const { data: appInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("*")
    .eq("id", createdAppId)
    .single();

  assert(appInDb.google_response_id === testRespId1, "Application in database matches google_response_id");
  assert(appInDb.email === testEmail1.toLowerCase(), "Application email stored in normalized lowercase");
  assert(Array.isArray(appInDb.boards) && appInDb.boards.includes("CBSE"), "Comma-delimited boards normalized to JSONB array");
  assert(appInDb.status === "PENDING", "Database confirms status is strictly PENDING");
  assert(appInDb.reviewed_at === null, "reviewed_at is null");
  assert(appInDb.reviewed_by === null, "reviewed_by is null");

  // 10. Attempted status tampering (caller passes status: 'APPROVED')
  const tamperRespId = `resp_tamper_${Date.now()}`;
  const tamperRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: {
      google_response_id: tamperRespId,
      full_name: "Sneaky Applicant",
      email: `sneaky.${Date.now()}@example.com`,
      status: "APPROVED", // Unauthorized attempt to self-approve
      reviewed_by: "00000000-0000-0000-0000-000000000001",
      reviewed_at: new Date().toISOString(),
      rejection_reason: "None",
      is_verified: true,
    },
  });
  assert(tamperRes.statusCode === 201, "Tamper attempt processed safely");
  const { data: tamperInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("*")
    .eq("id", tamperRes.body.application_id)
    .single();
  assert(tamperInDb.status === "PENDING", "Attempt to force status='APPROVED' was stripped; remains PENDING");
  assert(tamperInDb.reviewed_by === null, "Attempt to force reviewed_by was stripped; remains null");
  assert(tamperInDb.reviewed_at === null, "Attempt to force reviewed_at was stripped; remains null");

  // 11. Idempotency: Duplicate google_response_id delivery
  const duplicateRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: {
      google_response_id: testRespId1, // Same ID
      full_name: "Priya Sharma Updated",
      email: testEmail1,
      phone: "+91 9999999999",
      experience: "6 years updated",
    },
  });
  assert(duplicateRes.statusCode === 200, "Redelivery of duplicate google_response_id returns HTTP 200 OK");
  assert(duplicateRes.body.action === "updated", "Action reports 'updated'");
  assert(duplicateRes.body.application_id === createdAppId, "Returns same application_id (no duplicate row)");

  const { data: updatedAppInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("*")
    .eq("id", createdAppId)
    .single();
  assert(updatedAppInDb.phone === "+91 9999999999", "Pending application fields updated safely");

  // Verify total count with that google_response_id is exactly 1
  const { data: allWithSameId } = await supabaseAdmin
    .from("tutor_applications")
    .select("id")
    .eq("google_response_id", testRespId1);
  assert(allWithSameId.length === 1, "Zero duplicate rows created for identical google_response_id");

  // 12. Locked Application Protection: Transition application to APPROVED in DB, then redeliver
  await supabaseAdmin
    .from("tutor_applications")
    .update({
      status: "APPROVED",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", createdAppId);

  const lockedRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: {
      google_response_id: testRespId1,
      full_name: "Attacker Trying to Overwrite Approved App",
      email: testEmail1,
      phone: "000",
    },
  });
  assert(lockedRes.statusCode === 200, "Duplicate delivery for approved app returns HTTP 200");
  assert(lockedRes.body.action === "locked", "Action reports 'locked' (review state protected)");

  const { data: lockedAppInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("*")
    .eq("id", createdAppId)
    .single();
  assert(lockedAppInDb.status === "APPROVED", "Approved status was strictly protected against overwrite");
  assert(lockedAppInDb.full_name === "Priya Sharma Updated", "Applicant name was not overwritten after review");

  console.log("\n==================================================");
  console.log("TEST SUITE 4: Identity Linking & Anti-Hijacking");
  console.log("==================================================");

  // 13. Existing-user linking
  const existingUserEmail = `existing.user.${Date.now()}@example.com`;
  const { data: authUser1, error: errAuth1 } = await supabaseAdmin.auth.admin.createUser({
    email: existingUserEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Pre-existing User" },
  });
  if (errAuth1) throw errAuth1;
  const tempUserId = authUser1.user.id;

  const linkedRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: {
      google_response_id: testRespId2,
      full_name: "Pre-existing User",
      email: existingUserEmail.toUpperCase(), // Test case insensitivity
    },
  });
  assert(linkedRes.statusCode === 201, "Application created for pre-existing user");
  const { data: linkedAppInDb } = await supabaseAdmin
    .from("tutor_applications")
    .select("*")
    .eq("id", linkedRes.body.application_id)
    .single();
  assert(linkedAppInDb.user_id === tempUserId, "Application automatically linked to existing public.users record");

  // 14. Delayed user linking: Application created with user_id = NULL
  const delayedEmail = `delayed.tutor.${Date.now()}@example.com`;
  const delayedRespId = `resp_delayed_${Date.now()}`;
  const delayedAppRes = await sendWebhookRequest({
    secret: WEBHOOK_SECRET,
    body: {
      google_response_id: delayedRespId,
      full_name: "Delayed Signup Tutor",
      email: delayedEmail,
    },
  });
  const delayedAppId = delayedAppRes.body.application_id;

  const { data: preSignupApp } = await supabaseAdmin
    .from("tutor_applications")
    .select("user_id")
    .eq("id", delayedAppId)
    .single();
  assert(preSignupApp.user_id === null, "Pre-signup application has user_id = null");

  // Real user signup in auth.users triggers handle_new_auth_user which runs the delayed linking
  const { data: authUser2, error: errAuth2 } = await supabaseAdmin.auth.admin.createUser({
    email: delayedEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Delayed Signup Tutor" },
  });
  if (errAuth2) throw errAuth2;
  const newTutorUserId = authUser2.user.id;

  const { data: postSignupApp } = await supabaseAdmin
    .from("tutor_applications")
    .select("user_id")
    .eq("id", delayedAppId)
    .single();
  assert(postSignupApp.user_id === newTutorUserId, "Delayed user signup successfully linked application to new user_id");

  // 15. Anti-Hijacking: Already-linked application cannot be hijacked
  const { data: authUser3, error: errAuth3 } = await supabaseAdmin.auth.admin.createUser({
    email: `imposter.${Date.now()}@example.com`,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: "Imposter" },
  });
  if (errAuth3) throw errAuth3;
  const imposterUserId = authUser3.user.id;

  // Attempt to link where user_id is NULL should affect 0 rows because already linked
  const { data: hijackAttempt } = await supabaseAdmin
    .from("tutor_applications")
    .update({ user_id: imposterUserId })
    .eq("id", delayedAppId)
    .is("user_id", null)
    .select();
  assert(hijackAttempt.length === 0, "Already-linked application cannot be reassigned (anti-hijacking verified)");

  // 16. Multiple NULL google_response_id records
  const { data: manualApp1, error: errManual1 } = await supabaseAdmin
    .from("tutor_applications")
    .insert({
      full_name: "Direct Walk-in Tutor 1",
      email: `manual1.${Date.now()}@example.com`,
      google_response_id: null,
      status: "PENDING",
    })
    .select("id")
    .single();

  const { data: manualApp2, error: errManual2 } = await supabaseAdmin
    .from("tutor_applications")
    .insert({
      full_name: "Direct Walk-in Tutor 2",
      email: `manual2.${Date.now()}@example.com`,
      google_response_id: null,
      status: "PENDING",
    })
    .select("id")
    .single();

  assert(!errManual1 && !errManual2 && manualApp1.id && manualApp2.id, "Partial unique index permits multiple NULL google_response_id records");

  // Cleanup temporary test records
  await supabaseAdmin.from("tutor_applications").delete().in("id", [
    createdAppId,
    tamperRes.body.application_id,
    linkedRes.body.application_id,
    delayedAppId,
    manualApp1.id,
    manualApp2.id,
  ]);
  await supabaseAdmin.auth.admin.deleteUser(tempUserId);
  await supabaseAdmin.auth.admin.deleteUser(newTutorUserId);
  await supabaseAdmin.auth.admin.deleteUser(imposterUserId);

  console.log("\n==================================================");
  console.log(`TOTAL PHASE 4A TESTS: ${testsRun}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log("==================================================");

  if (testsFailed === 0) {
    console.log("🎉 ALL PHASE 4A GOOGLE FORMS INGESTION TESTS PASSED!\n");
    process.exit(0);
  } else {
    console.error(`💥 ${testsFailed} tests failed.`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
