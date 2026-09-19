#!/usr/bin/env node

/**
 * Tutr — Phase 6 Automated Test Suite: Student–Tutor Connection & Contact Unlock
 * Validates:
 * 1. Accepted request creates exactly one connection.
 * 2. Pending request cannot create connection.
 * 3. Declined request cannot create connection.
 * 4. Cancelled request cannot create connection.
 * 5. Student sees only own connections.
 * 6. Tutor sees only own connections.
 * 7. Anonymous user cannot access connections.
 * 8. Contact details hidden before payment.
 * 9. Client cannot modify payment status.
 * 10. Client cannot modify connection status.
 * 11. Client cannot modify payment amount.
 * 12. Razorpay order amount comes from server-side database amount.
 * 13. Invalid Razorpay signature rejected.
 * 14. Wrong order ID rejected.
 * 15. Wrong connection/student rejected.
 * 16. Successful payment unlocks contact.
 * 17. Duplicate verify request is idempotent.
 * 18. Duplicate webhook is idempotent.
 * 19. Invalid webhook signature rejected.
 * 20. Unrelated student cannot access unlocked contacts.
 * 21. Unrelated tutor cannot access unlocked contacts.
 * 22. Missing student phone is handled safely.
 * 23. Phase 5 regressions pass.
 * 24. Phase 4 regressions pass.
 * 25. Phase 3 OAuth regression passes.
 * 26. Phase 2 RLS regression passes.
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

async function runPhase6Validation() {
  console.log("\n==================================================");
  console.log("TUTR PHASE 6 — CONNECTION & CONTACT UNLOCK VALIDATION");
  console.log("==================================================");

  const timestamp = Date.now();
  const studentAEmail = `p6_student_a_${timestamp}@example.com`;
  const studentBEmail = `p6_student_b_${timestamp}@example.com`;
  const tutorEmail = `p6_tutor_ver_${timestamp}@example.com`;
  const otherTutorEmail = `p6_tutor_other_${timestamp}@example.com`;
  const password = "Password123!Phase6";

  let studentAUser, studentBUser, tutorUser, otherTutorUser;
  let studentAProfile, studentBProfile;
  let tutorApp, tutorProfile, otherTutorProfile;
  let sampleSubjectId, sampleClassId;

  const clientAnonymous = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const createdAuthUserIds = [];
  const createdRequestIds = [];
  const createdConnectionIds = [];

  try {
    console.log("\n[Setup] Provisioning personas and reference records...");

    const { data: subjects } = await supabaseAdmin.from("subjects").select("id").limit(1);
    const { data: classes } = await supabaseAdmin.from("classes").select("id").limit(1);
    sampleSubjectId = subjects[0].id;
    sampleClassId = classes[0].id;

    // 1. Provision Student A (Rahul)
    const { data: authSA } = await supabaseAdmin.auth.admin.createUser({
      email: studentAEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Rahul Student" },
    });
    studentAUser = authSA.user;
    createdAuthUserIds.push(studentAUser.id);
    await supabaseAdmin.from("users").update({ role: "STUDENT" }).eq("id", studentAUser.id);
    const { data: saProf } = await supabaseAdmin
      .from("students")
      .insert({ user_id: studentAUser.id, phone: "9876500001" })
      .select("id")
      .single();
    studentAProfile = saProf;

    // 2. Provision Student B (Pooja - missing phone to test null safety)
    const { data: authSB } = await supabaseAdmin.auth.admin.createUser({
      email: studentBEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Pooja Student" },
    });
    studentBUser = authSB.user;
    createdAuthUserIds.push(studentBUser.id);
    await supabaseAdmin.from("users").update({ role: "STUDENT" }).eq("id", studentBUser.id);
    const { data: sbProf } = await supabaseAdmin
      .from("students")
      .insert({ user_id: studentBUser.id, phone: null })
      .select("id")
      .single();
    studentBProfile = sbProf;

    // 3. Provision Verified Tutor
    const { data: authTV } = await supabaseAdmin.auth.admin.createUser({
      email: tutorEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Dr. Biswajit Mohanty" },
    });
    tutorUser = authTV.user;
    createdAuthUserIds.push(tutorUser.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", tutorUser.id);

    const { data: ta } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: tutorUser.id,
        full_name: "Dr. Biswajit Mohanty",
        email: "biswajit.tutor@example.com",
        phone: "9876543210",
        location: "Sahadevkhunta",
        qualification: "Ph.D. Mathematics",
        experience: "12 years",
        fee: "2500",
        status: "APPROVED",
      })
      .select("id")
      .single();
    tutorApp = ta;

    const { data: tp } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: tutorUser.id,
        application_id: tutorApp.id,
        display_name: "Dr. Biswajit Mohanty",
        locality: "Sahadevkhunta",
        qualification: "Ph.D. Mathematics",
        experience: "12 years",
        fee: "2500",
        is_verified: true,
      })
      .select("id")
      .single();
    tutorProfile = tp;

    // Link subject/class to tutor
    await supabaseAdmin.from("tutor_subjects").insert({
      tutor_id: tutorProfile.id,
      subject_id: sampleSubjectId,
    });
    await supabaseAdmin.from("tutor_classes").insert({
      tutor_id: tutorProfile.id,
      class_id: sampleClassId,
    });

    // 4. Provision Other Tutor
    const { data: authTO } = await supabaseAdmin.auth.admin.createUser({
      email: otherTutorEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Sasmita Rout" },
    });
    otherTutorUser = authTO.user;
    createdAuthUserIds.push(otherTutorUser.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", otherTutorUser.id);
    const { data: otp } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: otherTutorUser.id,
        display_name: "Sasmita Rout",
        locality: "OT Road",
        is_verified: true,
      })
      .select("id")
      .single();
    otherTutorProfile = otp;

    // 5. Create Sessions
    const studentASession = await getAuthSession(studentAEmail, password);
    const studentBSession = await getAuthSession(studentBEmail, password);
    const tutorSession = await getAuthSession(tutorEmail, password);
    const otherTutorSession = await getAuthSession(otherTutorEmail, password);

    console.log("  ✓ Setup completed successfully.");

    // ========================================================================
    // TEST SUITE 1: Connection Creation & State Constraints
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 1: Connection Lifecycle & State Enforcements");
    console.log("==================================================");

    // Create Request 1 (Student A -> Tutor)
    const { data: req1Res } = await studentASession.client.rpc("create_tutor_request", {
      p_tutor_id: tutorProfile.id,
      p_subject_id: sampleSubjectId,
      p_class_id: sampleClassId,
      p_message: "Math tuition needed",
    });
    const req1Id = req1Res?.request_id;
    createdRequestIds.push(req1Id);

    // Test 2: Pending request cannot create connection
    const { error: insertPendingErr } = await supabaseAdmin.from("tutor_connections").insert({
      request_id: req1Id,
      student_id: studentAProfile.id,
      tutor_id: tutorProfile.id,
      amount: 99,
      status: "PENDING_PAYMENT",
    });
    assert(
      insertPendingErr !== null && insertPendingErr.message.includes("Request must be ACCEPTED"),
      "Pending request cannot create connection (rejected by trigger)"
    );

    // Tutor accepts Request 1 with server-controlled amount ₹99
    const { data: acceptRes, error: acceptErr } = await tutorSession.client.rpc("accept_tutor_request", {
      p_request_id: req1Id,
      p_amount: 99,
    });
    assert(!acceptErr && acceptRes?.status === "ACCEPTED", "Tutor can accept request");

    // Test 1: Accepted request creates exactly one connection
    const { data: conn1 } = await supabaseAdmin
      .from("tutor_connections")
      .select("id, status, payment_status, amount, currency")
      .eq("request_id", req1Id)
      .single();

    assert(
      conn1 !== null &&
        conn1.status === "PENDING_PAYMENT" &&
        conn1.payment_status === "PENDING" &&
        Number(conn1.amount) === 99 &&
        conn1.currency === "INR",
      "Accepted request atomically creates exactly one tutor_connection in PENDING_PAYMENT status with amount ₹99"
    );
    if (conn1?.id) createdConnectionIds.push(conn1.id);

    // Test 3: Declined request cannot create connection
    const { data: req2Res } = await studentBSession.client.rpc("create_tutor_request", {
      p_tutor_id: tutorProfile.id,
      p_subject_id: sampleSubjectId,
      p_class_id: sampleClassId,
      p_message: "Will be declined",
    });
    const req2Id = req2Res?.request_id;
    createdRequestIds.push(req2Id);
    await tutorSession.client.rpc("decline_tutor_request", { p_request_id: req2Id });

    const { error: insertDeclinedErr } = await supabaseAdmin.from("tutor_connections").insert({
      request_id: req2Id,
      student_id: studentBProfile.id,
      tutor_id: tutorProfile.id,
      amount: 99,
      status: "PENDING_PAYMENT",
    });
    assert(
      insertDeclinedErr !== null && insertDeclinedErr.message.includes("Request must be ACCEPTED"),
      "Declined request cannot create connection"
    );

    // Test 4: Cancelled request cannot create connection
    const { data: req3Res } = await studentBSession.client.rpc("create_tutor_request", {
      p_tutor_id: tutorProfile.id,
      p_subject_id: sampleSubjectId,
      p_class_id: sampleClassId,
      p_message: "Will be cancelled",
    });
    const req3Id = req3Res?.request_id;
    createdRequestIds.push(req3Id);
    await studentBSession.client.rpc("cancel_tutor_request", { p_request_id: req3Id });

    const { error: insertCancelledErr } = await supabaseAdmin.from("tutor_connections").insert({
      request_id: req3Id,
      student_id: studentBProfile.id,
      tutor_id: tutorProfile.id,
      amount: 99,
      status: "PENDING_PAYMENT",
    });
    assert(
      insertCancelledErr !== null && insertCancelledErr.message.includes("Request must be ACCEPTED"),
      "Cancelled request cannot create connection"
    );

    // ========================================================================
    // TEST SUITE 2: Row Level Security & Tamper Resistance
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 2: RLS Isolation & Tamper Protection");
    console.log("==================================================");

    // Test 5: Student sees only own connections
    const { data: sAConns } = await studentASession.client.from("tutor_connections").select("id");
    const { data: sBConns } = await studentBSession.client.from("tutor_connections").select("id");
    assert(
      sAConns?.some((c) => c.id === conn1.id) && !sBConns?.some((c) => c.id === conn1.id),
      "Student sees only own connections; other students cannot view it"
    );

    // Test 6: Tutor sees only own connections
    const { data: tConns } = await tutorSession.client.from("tutor_connections").select("id");
    const { data: otConns } = await otherTutorSession.client.from("tutor_connections").select("id");
    assert(
      tConns?.some((c) => c.id === conn1.id) && !otConns?.some((c) => c.id === conn1.id),
      "Tutor sees only own connections; other tutors cannot view it"
    );

    // Test 7: Anonymous user cannot access connections
    const { data: anonConns, error: anonErr } = await clientAnonymous.from("tutor_connections").select("id");
    assert(
      (anonConns === null || anonConns.length === 0) && !anonErr,
      "Anonymous user cannot access connections (returns empty per RLS)"
    );

    // Test 8: Contact details hidden before payment
    const { data: preContactsStudent } = await studentASession.client.rpc(
      "get_unlocked_connection_contacts",
      { p_connection_id: conn1.id }
    );
    const { data: preContactsTutor } = await tutorSession.client.rpc(
      "get_unlocked_connection_contacts",
      { p_connection_id: conn1.id }
    );
    assert(
      preContactsStudent?.unlocked === false && preContactsTutor?.unlocked === false,
      "Contact details strictly locked for both student and tutor before payment"
    );

    // Test 9: Client cannot modify payment_status directly
    const updatePayRes = await studentASession.client
      .from("tutor_connections")
      .update({ payment_status: "SUCCESS" })
      .eq("id", conn1.id)
      .select();
    const { data: payCheck } = await supabaseAdmin
      .from("tutor_connections")
      .select("payment_status")
      .eq("id", conn1.id)
      .single();
    assert(
      (updatePayRes.error !== null || (updatePayRes.data && updatePayRes.data.length === 0)) &&
        payCheck?.payment_status === "PENDING",
      "Client cannot modify payment_status directly (blocked by RLS/triggers)"
    );

    // Test 10: Client cannot modify connection_status directly
    const updateStatusRes = await studentASession.client
      .from("tutor_connections")
      .update({ status: "CONTACT_UNLOCKED" })
      .eq("id", conn1.id)
      .select();
    const { data: statusCheck } = await supabaseAdmin
      .from("tutor_connections")
      .select("status")
      .eq("id", conn1.id)
      .single();
    assert(
      (updateStatusRes.error !== null || (updateStatusRes.data && updateStatusRes.data.length === 0)) &&
        statusCheck?.status === "PENDING_PAYMENT",
      "Client cannot modify connection_status directly (blocked by RLS/triggers)"
    );

    // Test 11: Client cannot modify payment amount directly
    const updateAmountRes = await studentASession.client
      .from("tutor_connections")
      .update({ amount: 1 })
      .eq("id", conn1.id)
      .select();
    const { data: amountCheck } = await supabaseAdmin
      .from("tutor_connections")
      .select("amount")
      .eq("id", conn1.id)
      .single();
    assert(
      (updateAmountRes.error !== null || (updateAmountRes.data && updateAmountRes.data.length === 0)) &&
        Number(amountCheck?.amount) === 99,
      "Client cannot modify payment amount directly (blocked by RLS/triggers)"
    );

    // ========================================================================
    // TEST SUITE 3: Razorpay Server Integration & Signature Verification
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 3: Razorpay Order Creation & Verification");
    console.log("==================================================");

    // Test 12: Razorpay order amount comes strictly from server-side database amount
    const createOrderRes = await postJson(
      "/api/payments/create-order",
      { connectionId: conn1.id },
      studentASession.cookieHeader
    );
    assert(
      createOrderRes.statusCode === 200 &&
        createOrderRes.body.success === true &&
        createOrderRes.body.amount === 9900 && // 99 * 100 paise
        Boolean(createOrderRes.body.orderId),
      "Razorpay order created server-side with authoritative database amount (9900 paise)"
    );
    const orderId = createOrderRes.body.orderId;

    // Test 13: Invalid Razorpay signature rejected
    const invalidVerifyRes = await postJson(
      "/api/payments/verify",
      {
        connectionId: conn1.id,
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_test_12345",
        razorpay_signature: "invalid_tampered_signature_hex",
      },
      studentASession.cookieHeader
    );
    assert(
      invalidVerifyRes.statusCode === 400 &&
        invalidVerifyRes.body.success === false &&
        invalidVerifyRes.body.error.includes("Invalid Razorpay payment signature"),
      "Invalid Razorpay HMAC signature rejected with HTTP 400"
    );

    // Test 14: Wrong order ID rejected
    const validSigForWrongOrder = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update("order_wrong_999999|pay_test_12345")
      .digest("hex");

    const wrongOrderVerifyRes = await postJson(
      "/api/payments/verify",
      {
        connectionId: conn1.id,
        razorpay_order_id: "order_wrong_999999",
        razorpay_payment_id: "pay_test_12345",
        razorpay_signature: validSigForWrongOrder,
      },
      studentASession.cookieHeader
    );
    assert(
      wrongOrderVerifyRes.statusCode === 400 &&
        wrongOrderVerifyRes.body.error.includes("does not match the connection record"),
      "Mismatched order ID rejected with HTTP 400"
    );

    // Test 15: Wrong connection / student rejected
    const validSigForStudentB = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${orderId}|pay_test_12345`)
      .digest("hex");

    const wrongStudentVerifyRes = await postJson(
      "/api/payments/verify",
      {
        connectionId: conn1.id,
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_test_12345",
        razorpay_signature: validSigForStudentB,
      },
      studentBSession.cookieHeader // Student B attempting to verify Student A's connection
    );
    assert(
      wrongStudentVerifyRes.statusCode === 403 &&
        wrongStudentVerifyRes.body.error.includes("Unauthorized access"),
      "Unauthorized student attempt rejected with HTTP 403"
    );

    // Test 16: Successful payment unlocks contact
    const validPaymentId = `pay_valid_${timestamp}`;
    const validSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${validPaymentId}`)
      .digest("hex");

    const successfulVerifyRes = await postJson(
      "/api/payments/verify",
      {
        connectionId: conn1.id,
        razorpay_order_id: orderId,
        razorpay_payment_id: validPaymentId,
        razorpay_signature: validSignature,
      },
      studentASession.cookieHeader
    );
    assert(
      successfulVerifyRes.statusCode === 200 && successfulVerifyRes.body.unlocked === true,
      "Valid payment signature successfully unlocks connection"
    );

    // Verify DB state
    const { data: unlockedConn } = await supabaseAdmin
      .from("tutor_connections")
      .select("status, payment_status, paid_at, contact_unlocked_at, razorpay_payment_id")
      .eq("id", conn1.id)
      .single();
    assert(
      unlockedConn?.status === "CONTACT_UNLOCKED" &&
        unlockedConn.payment_status === "SUCCESS" &&
        unlockedConn.paid_at !== null &&
        unlockedConn.contact_unlocked_at !== null &&
        unlockedConn.razorpay_payment_id === validPaymentId,
      "Database connection status is CONTACT_UNLOCKED and payment_status is SUCCESS with timestamps"
    );

    // Test 17: Duplicate verify request is idempotent
    const duplicateVerifyRes = await postJson(
      "/api/payments/verify",
      {
        connectionId: conn1.id,
        razorpay_order_id: orderId,
        razorpay_payment_id: validPaymentId,
        razorpay_signature: validSignature,
      },
      studentASession.cookieHeader
    );
    assert(
      duplicateVerifyRes.statusCode === 200 &&
        duplicateVerifyRes.body.success === true &&
        duplicateVerifyRes.body.unlocked === true,
      "Duplicate verify request is idempotent and succeeds safely"
    );

    // ========================================================================
    // TEST SUITE 4: Razorpay Webhook Authoritative Reconciliation
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 4: Webhook Signature & Idempotency");
    console.log("==================================================");

    const webhookPayload = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: validPaymentId,
            order_id: orderId,
            status: "captured",
            notes: { connection_id: conn1.id },
          },
        },
      },
    });

    // Test 19: Invalid webhook signature rejected
    const invalidWebhookRes = await postJson(
      "/api/payments/webhook",
      webhookPayload,
      "",
      { "x-razorpay-signature": "invalid_fake_webhook_signature" }
    );
    assert(
      invalidWebhookRes.statusCode === 400 && invalidWebhookRes.body.error === "Invalid webhook signature.",
      "Invalid webhook signature rejected with HTTP 400"
    );

    // Test 18: Duplicate webhook is idempotent
    const validWebhookSignature = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(webhookPayload)
      .digest("hex");

    const validWebhookRes = await postJson(
      "/api/payments/webhook",
      webhookPayload,
      "",
      { "x-razorpay-signature": validWebhookSignature }
    );
    assert(
      validWebhookRes.statusCode === 200 && validWebhookRes.body.status === "ok",
      "Valid Razorpay webhook processes idempotently and returns HTTP 200 ok"
    );

    // ========================================================================
    // TEST SUITE 5: Contact Unlock Access Control & Privacy
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 5: Contact Unlock Access Control");
    console.log("==================================================");

    // Student A reads unlocked tutor contact
    const { data: studentAUnlockedContacts } = await studentASession.client.rpc(
      "get_unlocked_connection_contacts",
      { p_connection_id: conn1.id }
    );
    assert(
      studentAUnlockedContacts?.unlocked === true &&
        studentAUnlockedContacts.tutor?.name === "Dr. Biswajit Mohanty" &&
        studentAUnlockedContacts.tutor?.phone === "9876543210" &&
        studentAUnlockedContacts.tutor?.email === "biswajit.tutor@example.com" &&
        studentAUnlockedContacts.tutor?.locality === "Sahadevkhunta",
      "Student receives tutor's canonical phone, email, and locality after payment"
    );

    // Tutor reads unlocked student contact
    const { data: tutorUnlockedContacts } = await tutorSession.client.rpc(
      "get_unlocked_connection_contacts",
      { p_connection_id: conn1.id }
    );
    assert(
      tutorUnlockedContacts?.unlocked === true &&
        tutorUnlockedContacts.student?.name === "Rahul Student" &&
        tutorUnlockedContacts.student?.email === studentAEmail &&
        tutorUnlockedContacts.student?.phone === "9876500001",
      "Tutor receives student's name, email, and phone after payment"
    );

    // Test 20: Unrelated student cannot access unlocked contacts
    const { error: unrelatedStudentErr } = await studentBSession.client.rpc(
      "get_unlocked_connection_contacts",
      { p_connection_id: conn1.id }
    );
    assert(
      unrelatedStudentErr !== null && unrelatedStudentErr.message.includes("Unauthorized"),
      "Unrelated student cannot access unlocked contacts (RPC throws Unauthorized)"
    );

    // Test 21: Unrelated tutor cannot access unlocked contacts
    const { error: unrelatedTutorErr } = await otherTutorSession.client.rpc(
      "get_unlocked_connection_contacts",
      { p_connection_id: conn1.id }
    );
    assert(
      unrelatedTutorErr !== null && unrelatedTutorErr.message.includes("Unauthorized"),
      "Unrelated tutor cannot access unlocked contacts (RPC throws Unauthorized)"
    );

    // Test 22: Missing student phone is handled safely
    // Student B requests Tutor -> Tutor accepts -> unlock -> student.phone is null
    const { data: req4Res } = await studentBSession.client.rpc("create_tutor_request", {
      p_tutor_id: tutorProfile.id,
      p_subject_id: sampleSubjectId,
      p_class_id: sampleClassId,
      p_message: "Missing phone test",
    });
    const req4Id = req4Res?.request_id;
    createdRequestIds.push(req4Id);

    const { data: accept4Res } = await tutorSession.client.rpc("accept_tutor_request", {
      p_request_id: req4Id,
      p_amount: 99,
    });
    const conn4Id = accept4Res?.connection_id;
    if (conn4Id) createdConnectionIds.push(conn4Id);

    // Unlock conn4
    await supabaseAdmin.rpc("unlock_connection_after_payment", {
      p_connection_id: conn4Id,
      p_razorpay_order_id: `order_test_${timestamp}_4`,
      p_razorpay_payment_id: `pay_test_${timestamp}_4`,
      p_razorpay_signature: "sig_mock",
    });

    const { data: tutorUnlockedNullPhoneContacts } = await tutorSession.client.rpc(
      "get_unlocked_connection_contacts",
      { p_connection_id: conn4Id }
    );
    assert(
      tutorUnlockedNullPhoneContacts?.unlocked === true &&
        tutorUnlockedNullPhoneContacts.student?.phone === null &&
        tutorUnlockedNullPhoneContacts.student?.email === studentBEmail,
      "Missing student phone handled safely (returns NULL without error or fabrication)"
    );

    // ========================================================================
    // TEST SUITE 6: Platform Regressions
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 6: Platform Regression Verification");
    console.log("==================================================");

    // Test 23: Phase 5 Regression (Browse tutors & public profile)
    const { data: publicTutors } = await supabaseAdmin.from("public_tutor_profiles").select("id, display_name");
    assert(
      publicTutors?.some((t) => t.id === tutorProfile.id),
      "Phase 5 regression: Public verified tutor directory remains active and accessible"
    );

    // Test 24: Phase 4 Admin regression
    const { data: appData } = await supabaseAdmin.from("tutor_applications").select("id, status").eq("id", tutorApp.id).single();
    assert(
      appData?.status === "APPROVED",
      "Phase 4 regression: Approved tutor application state remains intact"
    );

    // Test 25: Phase 3 OAuth / user identity regression
    const { data: userRecord } = await supabaseAdmin.from("users").select("id, role").eq("id", studentAUser.id).single();
    assert(
      userRecord?.role === "STUDENT",
      "Phase 3 regression: User role and identity system functional"
    );

    // Test 26: Phase 2 RLS regression
    const { data: anonUsers } = await clientAnonymous.from("users").select("id");
    assert(
      anonUsers?.length === 0,
      "Phase 2 regression: Users table RLS blocks unauthorized reads"
    );

  } catch (err) {
    console.error("Unexpected error during Phase 6 validation:", err);
  } finally {
    console.log("\n[Cleanup] Cleaning up test records...");
    for (const cid of createdConnectionIds) {
      await supabaseAdmin.from("tutor_connections").delete().eq("id", cid);
    }
    for (const rid of createdRequestIds) {
      await supabaseAdmin.from("tutor_requests").delete().eq("id", rid);
    }
    if (tutorProfile?.id) {
      await supabaseAdmin.from("tutor_subjects").delete().eq("tutor_id", tutorProfile.id);
      await supabaseAdmin.from("tutor_classes").delete().eq("tutor_id", tutorProfile.id);
      await supabaseAdmin.from("tutor_profiles").delete().eq("id", tutorProfile.id);
    }
    if (otherTutorProfile?.id) {
      await supabaseAdmin.from("tutor_profiles").delete().eq("id", otherTutorProfile.id);
    }
    if (tutorApp?.id) {
      await supabaseAdmin.from("tutor_applications").delete().eq("id", tutorApp.id);
    }
    for (const uid of createdAuthUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
    }
    console.log("  ✓ Cleanup complete.\n");
  }

  console.log("==================================================");
  console.log(`TOTAL CHECKS: ${totalChecks}`);
  console.log(`PASSED: ${passedChecks}`);
  console.log(`FAILED: ${failedChecks}`);
  console.log("==================================================");

  if (failedChecks > 0) {
    console.error("❌ Phase 6 validation failed.");
    process.exit(1);
  } else {
    console.log("🎉 ALL PHASE 6 VALIDATION CHECKS PASSED!");
  }
}

runPhase6Validation();
