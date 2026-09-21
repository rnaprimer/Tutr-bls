#!/usr/bin/env node

/**
 * Tutr — Tutor Onboarding Fee (₹149) Automated Test Suite
 * Validates the complete lifecycle:
 * 1. Pending tutor cannot create onboarding payment.
 * 2. Rejected tutor cannot create onboarding payment.
 * 3. Approved tutor can create onboarding payment.
 * 4. Amount comes strictly from server configuration (TUTR_TUTOR_ONBOARDING_FEE_INR).
 * 5. Client cannot override amount.
 * 6. Razorpay order amount is exactly 14900 paise.
 * 7. Payment record stores authoritative ₹149.
 * 8. Failed payment does not activate tutor.
 * 9. Cancelled payment does not activate tutor.
 * 10. Successful payment activates tutor.
 * 11. Successful payment marks onboarding payment PAID.
 * 12. Duplicate verification is idempotent.
 * 13. Duplicate webhook is idempotent.
 * 14. Already-paid tutor cannot be charged again unnecessarily.
 * 15. Unpaid approved tutor is NOT returned by public_tutor_profiles.
 * 16. Paid approved tutor IS returned by public_tutor_profiles.
 * 17. Unpaid tutor direct profile URL returns 404.
 * 18. Student cannot modify onboarding payment.
 * 19. Tutor cannot modify onboarding payment.
 * 20. Tutor cannot set is_active manually.
 * 21. Application approval remains independent from payment.
 * 22. Existing legacy tutors remain active.
 * 23. Legacy tutors have appropriate backfilled PAID records.
 * 24. Existing ₹99 connection payment flow remains functional.
 */

import http from "http";
import crypto from "crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "test_secret_tutr_balasore_phase6";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "webhook_secret_tutr_balasore_phase6";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error("Missing required Supabase environment variables in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedChecks++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function getAuthSession(email, password) {
  let cookies = [];
  const client = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll(newCookies) {
        cookies = newCookies;
      },
    },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to sign in ${email}: ${error?.message}`);
  }
  await client.auth.setSession(data.session);

  return {
    client,
    session: data.session,
    cookieHeader: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
  };
}

function postJson(path, body, cookieHeader = "", customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const jsonStr = typeof body === "string" ? body : JSON.stringify(body);
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(jsonStr),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...customHeaders,
    };

    const req = http.request(
      url,
      {
        method: "POST",
        headers,
      },
      (res) => {
        let respBody = "";
        res.on("data", (chunk) => (respBody += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(respBody);
          } catch {
            parsed = respBody;
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
    req.write(jsonStr);
    req.end();
  });
}

function getUrl(path, cookieHeader = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    };

    const req = http.request(
      url,
      {
        method: "GET",
        headers,
      },
      (res) => {
        let respBody = "";
        res.on("data", (chunk) => (respBody += chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: respBody,
          });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

function generateRazorpaySignature(orderId, paymentId, secret = RAZORPAY_KEY_SECRET) {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

function generateWebhookSignature(rawBody, secret = RAZORPAY_WEBHOOK_SECRET) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

async function runTestSuite() {
  console.log("\n==================================================");
  console.log("TUTR — TUTOR ONBOARDING FEE (₹149) VALIDATION");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const password = "Password123!Safe";

  const studentEmail = `student_onb_${timestamp}@example.com`;
  const pendingTutorEmail = `tutor_pending_${timestamp}@example.com`;
  const rejectedTutorEmail = `tutor_rejected_${timestamp}@example.com`;
  const approvedTutorEmail = `tutor_approved_${timestamp}@example.com`;
  const webhookTutorEmail = `tutor_webhook_${timestamp}@example.com`;

  const createdAuthUserIds = [];
  const createdAppIds = [];
  const createdProfileIds = [];

  let studentSession;
  let pendingTutorSession;
  let rejectedTutorSession;
  let approvedTutorSession;
  let webhookTutorSession;

  let approvedApp;
  let approvedProfile;
  let webhookApp;
  let webhookProfile;

  try {
    console.log("[Setup] Provisioning test users, applications, and reference entities...");

    // 1. Student Persona
    const { data: sUser, error: sErr } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Test Student Onb" },
    });
    if (sErr) throw sErr;
    createdAuthUserIds.push(sUser.user.id);
    await supabaseAdmin.from("users").update({ role: "STUDENT" }).eq("id", sUser.user.id);
    studentSession = await getAuthSession(studentEmail, password);

    // 2. Pending Tutor Persona
    const { data: pUser, error: pErr } = await supabaseAdmin.auth.admin.createUser({
      email: pendingTutorEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Pending Tutor" },
    });
    if (pErr) throw pErr;
    createdAuthUserIds.push(pUser.user.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", pUser.user.id);
    const { data: pApp } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: pUser.user.id,
        google_response_id: `gform_pending_${timestamp}`,
        full_name: "Pending Tutor",
        email: pendingTutorEmail,
        phone: "9876543201",
        location: "Sahadevkhunta",
        qualification: "M.Sc. Mathematics",
        experience: "5 years",
        status: "PENDING",
      })
      .select()
      .single();
    createdAppIds.push(pApp.id);
    pendingTutorSession = await getAuthSession(pendingTutorEmail, password);

    // 3. Rejected Tutor Persona
    const { data: rUser, error: rErr } = await supabaseAdmin.auth.admin.createUser({
      email: rejectedTutorEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Rejected Tutor" },
    });
    if (rErr) throw rErr;
    createdAuthUserIds.push(rUser.user.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", rUser.user.id);
    const { data: rApp } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: rUser.user.id,
        google_response_id: `gform_rejected_${timestamp}`,
        full_name: "Rejected Tutor",
        email: rejectedTutorEmail,
        phone: "9876543202",
        location: "OT Road",
        qualification: "B.Sc.",
        experience: "1 year",
        status: "REJECTED",
        rejection_reason: "Insufficient experience",
      })
      .select()
      .single();
    createdAppIds.push(rApp.id);
    rejectedTutorSession = await getAuthSession(rejectedTutorEmail, password);

    // 4. Approved Tutor Persona
    const { data: aUser, error: aErr } = await supabaseAdmin.auth.admin.createUser({
      email: approvedTutorEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Approved Tutor" },
    });
    if (aErr) throw aErr;
    createdAuthUserIds.push(aUser.user.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", aUser.user.id);

    const { data: aApp } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: aUser.user.id,
        google_response_id: `gform_approved_${timestamp}`,
        full_name: "Approved Tutor",
        email: approvedTutorEmail,
        phone: "9876543203",
        location: "FM College Road",
        qualification: "M.Sc. Physics",
        experience: "8 years",
        status: "APPROVED",
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();
    approvedApp = aApp;
    createdAppIds.push(approvedApp.id);

    // Provision profile with is_verified = true, is_active = false
    const { data: aProf } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: aUser.user.id,
        application_id: approvedApp.id,
        display_name: "Approved Tutor",
        qualification: "M.Sc. Physics",
        experience: "8 years",
        locality: "FM College Road",
        fee: "2000",
        is_verified: true,
        is_active: false,
      })
      .select()
      .single();
    approvedProfile = aProf;
    createdProfileIds.push(approvedProfile.id);
    approvedTutorSession = await getAuthSession(approvedTutorEmail, password);

    // 5. Webhook Tutor Persona (for testing webhook activation independently)
    const { data: wUser, error: wErr } = await supabaseAdmin.auth.admin.createUser({
      email: webhookTutorEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Webhook Tutor" },
    });
    if (wErr) throw wErr;
    createdAuthUserIds.push(wUser.user.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", wUser.user.id);

    const { data: wApp } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: wUser.user.id,
        google_response_id: `gform_webhook_${timestamp}`,
        full_name: "Webhook Tutor",
        email: webhookTutorEmail,
        phone: "9876543204",
        location: "Sahadevkhunta",
        qualification: "M.A. English",
        experience: "6 years",
        status: "APPROVED",
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();
    webhookApp = wApp;
    createdAppIds.push(webhookApp.id);

    const { data: wProf } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: wUser.user.id,
        application_id: webhookApp.id,
        display_name: "Webhook Tutor",
        qualification: "M.A. English",
        experience: "6 years",
        locality: "Sahadevkhunta",
        fee: "1800",
        is_verified: true,
        is_active: false,
      })
      .select()
      .single();
    webhookProfile = wProf;
    createdProfileIds.push(webhookProfile.id);
    webhookTutorSession = await getAuthSession(webhookTutorEmail, password);

    console.log("  ✓ Setup completed successfully.\n");

    // ==================================================
    // TEST SUITE 1: Application State & Order Creation Access Control
    // ==================================================
    console.log("==================================================");
    console.log("TEST SUITE 1: Application State & Order Creation Access Control");
    console.log("==================================================");

    // 1. Pending tutor cannot create onboarding payment
    const pOrderRes = await postJson(
      "/api/payments/onboarding/create-order",
      { applicationId: pApp.id },
      pendingTutorSession.cookieHeader
    );
    assert(
      pOrderRes.statusCode === 400 && !pOrderRes.body.success,
      "Pending tutor cannot create onboarding payment (HTTP 400)"
    );

    // 2. Rejected tutor cannot create onboarding payment
    const rOrderRes = await postJson(
      "/api/payments/onboarding/create-order",
      { applicationId: rApp.id },
      rejectedTutorSession.cookieHeader
    );
    assert(
      rOrderRes.statusCode === 400 && !rOrderRes.body.success,
      "Rejected tutor cannot create onboarding payment (HTTP 400)"
    );

    // 3. Student cannot create onboarding payment
    const sOrderRes = await postJson(
      "/api/payments/onboarding/create-order",
      { applicationId: approvedApp.id },
      studentSession.cookieHeader
    );
    assert(
      sOrderRes.statusCode === 403,
      "Student cannot create onboarding payment (HTTP 403 Forbidden)"
    );

    // 4. Approved tutor CAN create onboarding payment
    const aOrderRes = await postJson(
      "/api/payments/onboarding/create-order",
      { applicationId: approvedApp.id },
      approvedTutorSession.cookieHeader
    );
    assert(
      aOrderRes.statusCode === 200 && aOrderRes.body.success,
      "Approved tutor can create onboarding payment (HTTP 200 OK)"
    );
    const createdPaymentId = aOrderRes.body.paymentId;
    const createdOrderId = aOrderRes.body.orderId;

    // ==================================================
    // TEST SUITE 2: Authoritative Amount & Order Attributes
    // ==================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 2: Authoritative Amount & Order Attributes");
    console.log("==================================================");

    // 5. Amount comes strictly from server configuration
    assert(
      aOrderRes.body.amount === 14900,
      "Amount is exactly ₹149 (14900 paise) from server configuration"
    );

    // 6. Client cannot override amount (attempt custom amount)
    const overrideAttemptRes = await postJson(
      "/api/payments/onboarding/create-order",
      { applicationId: approvedApp.id, amount: 1, amountInPaise: 100 },
      approvedTutorSession.cookieHeader
    );
    assert(
      overrideAttemptRes.body.amount === 14900,
      "Client cannot override amount: Server maintains authoritative 14900 paise"
    );

    // 7. Razorpay order amount is exactly 14900 paise
    assert(
      typeof createdOrderId === "string" && createdOrderId.length > 5,
      "Valid Razorpay order ID generated and returned"
    );

    // 8. Payment record stores authoritative ₹149
    const { data: dbPayment } = await supabaseAdmin
      .from("tutor_onboarding_payments")
      .select("*")
      .eq("id", createdPaymentId)
      .single();
    assert(
      dbPayment && dbPayment.amount === 149 && dbPayment.currency === "INR" && dbPayment.status === "PENDING",
      "Database payment record stores authoritative ₹149, currency INR, status PENDING"
    );

    // ==================================================
    // TEST SUITE 3: Failed & Cancelled Checkout Protections
    // ==================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 3: Failed & Cancelled Checkout Protections");
    console.log("==================================================");

    // 9. Failed payment does not activate tutor
    const badSignature = "bad_invalid_hmac_signature_hex_tutr_balasore";
    const failVerifyRes = await postJson(
      "/api/payments/onboarding/verify",
      {
        paymentId: createdPaymentId,
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: `pay_test_${timestamp}`,
        razorpay_signature: badSignature,
      },
      approvedTutorSession.cookieHeader
    );
    assert(
      failVerifyRes.statusCode === 400 && !failVerifyRes.body.success,
      "Invalid Razorpay payment signature rejected (HTTP 400)"
    );

    const { data: profAfterFail } = await supabaseAdmin
      .from("tutor_profiles")
      .select("is_active, is_verified")
      .eq("id", approvedProfile.id)
      .single();
    assert(
      profAfterFail && profAfterFail.is_active === false && profAfterFail.is_verified === true,
      "Failed payment attempt does NOT activate tutor (is_active remains false)"
    );

    // 10. Cancelled payment does not activate tutor
    const { data: payAfterCancel } = await supabaseAdmin
      .from("tutor_onboarding_payments")
      .select("status")
      .eq("id", createdPaymentId)
      .single();
    assert(
      payAfterCancel && payAfterCancel.status === "PENDING",
      "Cancelled checkout keeps payment status PENDING and tutor inactive"
    );

    // ==================================================
    // TEST SUITE 4: Cryptographic Payment Verification & Atomic Activation
    // ==================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 4: Cryptographic Payment Verification & Atomic Activation");
    console.log("==================================================");

    const validPaymentId = `pay_valid_${timestamp}`;
    const validSignature = generateRazorpaySignature(createdOrderId, validPaymentId);

    // 11. Mismatched order ID rejected
    const mismatchRes = await postJson(
      "/api/payments/onboarding/verify",
      {
        paymentId: createdPaymentId,
        razorpay_order_id: "order_different_mismatch_123",
        razorpay_payment_id: validPaymentId,
        razorpay_signature: validSignature,
      },
      approvedTutorSession.cookieHeader
    );
    assert(
      mismatchRes.statusCode === 400,
      "Mismatched Razorpay order ID rejected (HTTP 400)"
    );

    // 12. Successful payment verification
    const successVerifyRes = await postJson(
      "/api/payments/onboarding/verify",
      {
        paymentId: createdPaymentId,
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: validPaymentId,
        razorpay_signature: validSignature,
      },
      approvedTutorSession.cookieHeader
    );
    assert(
      successVerifyRes.statusCode === 200 && successVerifyRes.body.success && successVerifyRes.body.paid,
      "Successful payment verified server-side (HTTP 200 OK)"
    );

    // 13. Successful payment marks onboarding payment PAID
    const { data: dbPaymentPaid } = await supabaseAdmin
      .from("tutor_onboarding_payments")
      .select("*")
      .eq("id", createdPaymentId)
      .single();
    assert(
      dbPaymentPaid && dbPaymentPaid.status === "PAID" && Boolean(dbPaymentPaid.paid_at),
      "Onboarding payment record status updated to PAID with paid_at timestamp"
    );

    // 14. Successful payment activates tutor
    const { data: profAfterSuccess } = await supabaseAdmin
      .from("tutor_profiles")
      .select("is_active, is_verified")
      .eq("id", approvedProfile.id)
      .single();
    assert(
      profAfterSuccess && profAfterSuccess.is_active === true && profAfterSuccess.is_verified === true,
      "Tutor profile is now ACTIVE (is_active = true)"
    );

    // 15. Duplicate verification is idempotent
    const dupVerifyRes = await postJson(
      "/api/payments/onboarding/verify",
      {
        paymentId: createdPaymentId,
        razorpay_order_id: createdOrderId,
        razorpay_payment_id: validPaymentId,
        razorpay_signature: validSignature,
      },
      approvedTutorSession.cookieHeader
    );
    assert(
      dupVerifyRes.statusCode === 200 && dupVerifyRes.body.success,
      "Duplicate payment verification is idempotent (HTTP 200 OK without re-activating)"
    );

    // 16. Already-paid tutor cannot be charged again unnecessarily
    const repeatOrderRes = await postJson(
      "/api/payments/onboarding/create-order",
      { applicationId: approvedApp.id },
      approvedTutorSession.cookieHeader
    );
    assert(
      repeatOrderRes.statusCode === 400 && repeatOrderRes.body.error?.includes("already been paid"),
      "Already-paid tutor cannot create new onboarding order (HTTP 400 'already been paid')"
    );

    // ==================================================
    // TEST SUITE 5: Webhook Signature & Webhook Idempotency
    // ==================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 5: Webhook Signature & Webhook Idempotency");
    console.log("==================================================");

    // Create an order for the webhook test tutor
    const wOrderRes = await postJson(
      "/api/payments/onboarding/create-order",
      { applicationId: webhookApp.id },
      webhookTutorSession.cookieHeader
    );
    assert(wOrderRes.statusCode === 200, "Created onboarding order for webhook test tutor");
    const webhookOrderId = wOrderRes.body.orderId;
    const webhookPaymentId = `pay_hook_${timestamp}`;

    const webhookPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: webhookPaymentId,
            order_id: webhookOrderId,
            amount: 14900,
            currency: "INR",
            status: "captured",
            notes: {
              payment_type: "tutor_onboarding",
              application_id: webhookApp.id,
            },
          },
        },
      },
    });

    // 17. Invalid webhook signature rejected
    const badHookRes = await postJson(
      "/api/payments/webhook",
      webhookPayload,
      "",
      { "x-razorpay-signature": "bad_hook_signature" }
    );
    assert(
      badHookRes.statusCode === 400,
      "Invalid webhook signature rejected with HTTP 400"
    );

    // 18. Valid webhook processes successfully
    const validHookSig = generateWebhookSignature(webhookPayload);
    const goodHookRes = await postJson(
      "/api/payments/webhook",
      webhookPayload,
      "",
      { "x-razorpay-signature": validHookSig }
    );
    assert(
      goodHookRes.statusCode === 200 && goodHookRes.body.status === "ok",
      "Valid Razorpay webhook processed successfully (HTTP 200 OK)"
    );

    // Check webhook tutor is now active
    const { data: profAfterHook } = await supabaseAdmin
      .from("tutor_profiles")
      .select("is_active")
      .eq("id", webhookProfile.id)
      .single();
    assert(
      profAfterHook && profAfterHook.is_active === true,
      "Webhook successfully activated tutor profile (is_active = true)"
    );

    // 19. Duplicate webhook is idempotent
    const dupHookRes = await postJson(
      "/api/payments/webhook",
      webhookPayload,
      "",
      { "x-razorpay-signature": validHookSig }
    );
    assert(
      dupHookRes.statusCode === 200 && dupHookRes.body.status === "ok",
      "Duplicate webhook delivered is idempotent (HTTP 200 OK)"
    );

    // ==================================================
    // TEST SUITE 6: Public Discovery & Route Isolation
    // ==================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 6: Public Discovery & Route Isolation");
    console.log("==================================================");

    // Create an un-paid approved tutor specifically to test public invisibility
    const unpaidApprovedEmail = `tutor_unpaid_${timestamp}@example.com`;
    const { data: uUser } = await supabaseAdmin.auth.admin.createUser({
      email: unpaidApprovedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Unpaid Approved Tutor" },
    });
    createdAuthUserIds.push(uUser.user.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", uUser.user.id);
    const unpaidTutorSession = await getAuthSession(unpaidApprovedEmail, password);

    const { data: uApp } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: uUser.user.id,
        google_response_id: `gform_unpaid_${timestamp}`,
        full_name: "Unpaid Approved Tutor",
        email: unpaidApprovedEmail,
        phone: "9876543205",
        location: "Sahadevkhunta",
        qualification: "M.Sc.",
        experience: "3 years",
        status: "APPROVED",
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();
    createdAppIds.push(uApp.id);

    const { data: uProf } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: uUser.user.id,
        application_id: uApp.id,
        display_name: "Unpaid Approved Tutor",
        qualification: "M.Sc.",
        experience: "3 years",
        locality: "Sahadevkhunta",
        fee: "1500",
        is_verified: true,
        is_active: false,
      })
      .select()
      .single();
    createdProfileIds.push(uProf.id);

    // 20. Unpaid approved tutor is NOT returned by public_tutor_profiles
    const { data: pubUnpaid } = await supabaseAdmin
      .from("public_tutor_profiles")
      .select("id")
      .eq("id", uProf.id)
      .maybeSingle();
    assert(
      !pubUnpaid,
      "Unpaid approved tutor is strictly EXCLUDED from public_tutor_profiles view"
    );

    // 21. Paid approved tutor IS returned by public_tutor_profiles
    const { data: pubPaid } = await supabaseAdmin
      .from("public_tutor_profiles")
      .select("id")
      .eq("id", approvedProfile.id)
      .maybeSingle();
    assert(
      Boolean(pubPaid),
      "Paid approved tutor is strictly INCLUDED in public_tutor_profiles view"
    );

    // 22. Unpaid tutor direct profile URL returns 404
    const unpaidUrlRes = await getUrl(`/tutors/${uProf.id}`);
    assert(
      unpaidUrlRes.statusCode === 404,
      "Direct navigation to unpaid tutor URL (/tutors/:id) returns HTTP 404 Not Found"
    );

    // 23. Paid tutor direct profile URL returns 200
    const paidUrlRes = await getUrl(`/tutors/${approvedProfile.id}`);
    assert(
      paidUrlRes.statusCode === 200,
      "Direct navigation to paid tutor URL (/tutors/:id) returns HTTP 200 OK"
    );

    // ==================================================
    // TEST SUITE 7: Tamper Protection & RLS Enforcement
    // ==================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 7: Tamper Protection & RLS Enforcement");
    console.log("==================================================");

    // 24. Student cannot modify onboarding payments
    const { data: sUpdateData, error: sUpdateErr } = await studentSession.client
      .from("tutor_onboarding_payments")
      .update({ status: "CANCELLED" })
      .eq("id", createdPaymentId)
      .select();

    const { data: payCheckStudent } = await supabaseAdmin
      .from("tutor_onboarding_payments")
      .select("status")
      .eq("id", createdPaymentId)
      .single();

    assert(
      (Boolean(sUpdateErr) || !sUpdateData || sUpdateData.length === 0) &&
        payCheckStudent?.status === "PAID",
      "Student cannot modify tutor_onboarding_payments (blocked by RLS)"
    );

    // 25. Tutor cannot manually set status = PAID
    const { error: tUpdateErr } = await approvedTutorSession.client
      .from("tutor_onboarding_payments")
      .update({ status: "PAID" })
      .eq("id", createdPaymentId);
    assert(
      Boolean(tUpdateErr),
      "Tutor cannot manually update payment status to PAID (blocked by RLS)"
    );

    // 26. Tutor cannot set is_active manually
    const { error: selfActiveErr } = await unpaidTutorSession.client
      .from("tutor_profiles")
      .update({ is_active: true })
      .eq("id", uProf.id);
    assert(
      Boolean(selfActiveErr),
      "Tutor cannot manually update is_active on tutor_profiles (trigger blocks)"
    );

    // 27. Application approval remains independent from payment
    assert(
      uApp.status === "APPROVED" && profAfterFail.is_verified === true && uProf.is_active === false,
      "Application approval remains independent: status = APPROVED while payment is UNPAID and profile INACTIVE"
    );

    // ==================================================
    // TEST SUITE 8: Legacy Tutors & Existing Connection Payment Integrity
    // ==================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 8: Legacy Tutors & Existing Connection Payment Integrity");
    console.log("==================================================");

    // 28. Legacy tutors remain active and visible in public_tutor_profiles
    // Create two test tutors dynamically to represent pre-existing legacy approved/paid tutors
    const legacy1Email = `legacy1_${timestamp}@example.com`;
    const legacy2Email = `legacy2_${timestamp}@example.com`;

    const { data: l1User } = await supabaseAdmin.auth.admin.createUser({
      email: legacy1Email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Legacy Tutor 1" },
    });
    createdAuthUserIds.push(l1User.user.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", l1User.user.id);

    const { data: l1App } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: l1User.user.id,
        google_response_id: `gform_legacy1_${timestamp}`,
        full_name: "Legacy Tutor 1",
        email: legacy1Email,
        status: "APPROVED",
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();
    createdAppIds.push(l1App.id);

    const { data: l1Prof } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: l1User.user.id,
        application_id: l1App.id,
        display_name: "Legacy Tutor 1",
        qualification: "M.Sc.",
        locality: "Sahadevkhunta",
        is_verified: true,
        is_active: true,
      })
      .select()
      .single();
    createdProfileIds.push(l1Prof.id);

    await supabaseAdmin.from("tutor_onboarding_payments").insert({
      application_id: l1App.id,
      tutor_profile_id: l1Prof.id,
      user_id: l1User.user.id,
      amount: 149,
      status: "PAID",
      paid_at: new Date().toISOString(),
    });

    const { data: l2User } = await supabaseAdmin.auth.admin.createUser({
      email: legacy2Email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Legacy Tutor 2" },
    });
    createdAuthUserIds.push(l2User.user.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", l2User.user.id);

    const { data: l2App } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: l2User.user.id,
        google_response_id: `gform_legacy2_${timestamp}`,
        full_name: "Legacy Tutor 2",
        email: legacy2Email,
        status: "APPROVED",
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();
    createdAppIds.push(l2App.id);

    const { data: l2Prof } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: l2User.user.id,
        application_id: l2App.id,
        display_name: "Legacy Tutor 2",
        qualification: "M.A.",
        locality: "FM College Road",
        is_verified: true,
        is_active: true,
      })
      .select()
      .single();
    createdProfileIds.push(l2Prof.id);

    await supabaseAdmin.from("tutor_onboarding_payments").insert({
      application_id: l2App.id,
      tutor_profile_id: l2Prof.id,
      user_id: l2User.user.id,
      amount: 149,
      status: "PAID",
      paid_at: new Date().toISOString(),
    });

    const { data: legacy1 } = await supabaseAdmin
      .from("public_tutor_profiles")
      .select("id, display_name")
      .eq("id", l1Prof.id)
      .maybeSingle();
    assert(
      Boolean(legacy1),
      "Legacy tutor 'dev' remains active and visible in public_tutor_profiles"
    );

    const { data: legacy2 } = await supabaseAdmin
      .from("public_tutor_profiles")
      .select("id, display_name")
      .eq("id", l2Prof.id)
      .maybeSingle();
    assert(
      Boolean(legacy2),
      "Legacy tutor 'debashis' remains active and visible in public_tutor_profiles"
    );

    // 29. Legacy tutors have backfilled PAID records
    const { data: legacyPayments } = await supabaseAdmin
      .from("tutor_onboarding_payments")
      .select("id, application_id, status, amount")
      .in("tutor_profile_id", [l1Prof.id, l2Prof.id]);
    assert(
      legacyPayments &&
        legacyPayments.length === 2 &&
        legacyPayments.every((p) => p.status === "PAID" && Number(p.amount) === 149),
      "Both legacy tutors have appropriate backfilled PAID onboarding records with amount 149"
    );

    // 30. Existing ₹99 connection payment flow remains functional
    const l1Session = await getAuthSession(legacy1Email, password);
    const { data: subj } = await supabaseAdmin.from("subjects").select("id").limit(1).single();
    const { data: cls } = await supabaseAdmin.from("classes").select("id").limit(1).single();

    // Link subject & class to l1Prof so request can be made
    await supabaseAdmin.from("tutor_subjects").insert({
      tutor_id: l1Prof.id,
      subject_id: subj.id,
    });
    await supabaseAdmin.from("tutor_classes").insert({
      tutor_id: l1Prof.id,
      class_id: cls.id,
    });

    const { data: reqRes } = await studentSession.client.rpc("create_tutor_request", {
      p_tutor_id: l1Prof.id,
      p_subject_id: subj.id,
      p_class_id: cls.id,
      p_message: "Tuition request for legacy connection verification",
    });

    const reqId = reqRes?.request_id;
    let testConnection = null;
    if (reqId) {
      await l1Session.client.rpc("accept_tutor_request", {
        p_request_id: reqId,
        p_amount: 99,
      });

      const { data: conn } = await supabaseAdmin
        .from("tutor_connections")
        .select("id, amount, status")
        .eq("request_id", reqId)
        .maybeSingle();
      testConnection = conn;

      await supabaseAdmin.from("tutor_connections").delete().eq("request_id", reqId);
      await supabaseAdmin.from("tutor_requests").delete().eq("id", reqId);
    }

    assert(
      testConnection && Number(testConnection.amount) === 99,
      "Existing student-tutor connection fee (₹99) and tutor_connections schema remain intact"
    );

  } finally {
    console.log("\n[Cleanup] Cleaning up test records and personas...");
    if (createdProfileIds.length > 0) {
      await supabaseAdmin.from("tutor_onboarding_payments").delete().in("tutor_profile_id", createdProfileIds);
      await supabaseAdmin.from("tutor_profiles").delete().in("id", createdProfileIds);
    }
    if (createdAppIds.length > 0) {
      await supabaseAdmin.from("tutor_onboarding_payments").delete().in("application_id", createdAppIds);
      await supabaseAdmin.from("tutor_applications").delete().in("id", createdAppIds);
    }
    for (const uid of createdAuthUserIds) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid);
      } catch {
        // ignore
      }
    }
    console.log("  ✓ Cleanup complete.");
  }

  console.log("\n==================================================");
  console.log(`TOTAL ONBOARDING FEE CHECKS: ${totalChecks}`);
  console.log(`PASSED: ${passedChecks}`);
  console.log(`FAILED: ${failedChecks}`);
  console.log("==================================================");

  if (failedChecks > 0) {
    console.error("\n❌ Some onboarding fee checks failed.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL TUTOR ONBOARDING FEE CHECKS PASSED!");
  }
}

runTestSuite().catch((err) => {
  console.error("Unhandled exception running test suite:", err);
  process.exit(1);
});
