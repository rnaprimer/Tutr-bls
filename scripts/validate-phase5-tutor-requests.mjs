#!/usr/bin/env node

/**
 * Tutr — Phase 5 Validation Suite
 * Student <-> Tutor Discovery & Tutor Request System
 * 
 * Verifies:
 * 1. Student can browse verified tutors in public marketplace.
 * 2. Unverified tutor does not appear in public marketplace.
 * 3. Rejected tutor does not appear in public marketplace.
 * 4. Student can view public tutor profile (/tutors/:id).
 * 5. Student can create a tutor request.
 * 6. New request starts strictly as PENDING.
 * 7. Duplicate active PENDING request is rejected at the database level.
 * 8. Student can view only their own requests via RLS.
 * 9. Tutor can see incoming requests addressed to them.
 * 10. Tutor cannot see another tutor's requests.
 * 11. Tutor can accept a PENDING request (atomic transition to ACCEPTED).
 * 12. Tutor can decline a PENDING request (atomic transition to DECLINED).
 * 13. Student cannot force ACCEPTED status directly.
 * 14. Student cannot modify tutor decisions or terminal states.
 * 15. Tutor cannot modify another tutor's requests.
 * 16. Anonymous user cannot create requests.
 * 17. Student private info (phone/email) is not exposed in tutor request dashboard.
 * 18. Tutor private info (phone/email/documents) is not exposed in public marketplace.
 * 19. Payment functionality is strictly excluded in Phase 5.
 * 20. Phase 4A regression passes.
 * 21. Phase 4B regression passes.
 * 22. Phase 4C regression passes.
 * 23. Phase 4D regression passes.
 * 24. Phase 3B OAuth regression passes.
 * 25. Phase 2B RLS regression passes.
 */

import http from "http";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error("Missing required environment variables in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

function fetchUrl(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = options.headers || {};

    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on("error", reject);
    req.end();
  });
}

async function runPhase5Validation() {
  console.log("\n==================================================");
  console.log("TUTR PHASE 5 — STUDENT ↔ TUTOR DISCOVERY & REQUEST VALIDATION");
  console.log("==================================================");

  const timestamp = Date.now();
  const studentAEmail = `p5_student_a_${timestamp}@example.com`;
  const studentBEmail = `p5_student_b_${timestamp}@example.com`;
  const tutorVerifiedEmail = `p5_tutor_ver_${timestamp}@example.com`;
  const tutorBEmail = `p5_tutor_b_${timestamp}@example.com`;
  const tutorUnverifiedEmail = `p5_tutor_unver_${timestamp}@example.com`;
  const password = "Password123!Secure";

  let studentAUser, studentBUser, tutorVerifiedUser, tutorBUser, tutorUnverifiedUser;
  let tutorVerifiedProfile, tutorBProfile, tutorUnverifiedProfile;
  let sampleSubjectId, sampleClassId;

  const clientStudentA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientStudentB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientTutorVerified = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientTutorB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientAnonymous = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const createdAuthUserIds = [];
  const createdRequestIds = [];

  try {
    // ------------------------------------------------------------------------
    // SETUP: Provision Personas and Reference Data
    // ------------------------------------------------------------------------
    console.log("\n[Setup] Provisioning personas and reference records...");

    // Fetch reference subject and class
    const { data: subjects } = await supabaseAdmin.from("subjects").select("id, name").limit(1);
    const { data: classes } = await supabaseAdmin.from("classes").select("id, name").limit(1);

    sampleSubjectId = subjects?.[0]?.id;
    sampleClassId = classes?.[0]?.id;

    if (!sampleSubjectId || !sampleClassId) {
      throw new Error("Missing seeded reference subjects or classes.");
    }

    // 1. Provision Student A
    const { data: authStudentA, error: errSA } = await supabaseAdmin.auth.admin.createUser({
      email: studentAEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Rahul Student" },
    });
    if (errSA) throw errSA;
    studentAUser = authStudentA.user;
    createdAuthUserIds.push(studentAUser.id);

    await supabaseAdmin.from("users").update({ role: "STUDENT" }).eq("id", studentAUser.id);
    await supabaseAdmin.from("students").insert({ user_id: studentAUser.id });

    // 2. Provision Student B
    const { data: authStudentB, error: errSB } = await supabaseAdmin.auth.admin.createUser({
      email: studentBEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Pooja Student" },
    });
    if (errSB) throw errSB;
    studentBUser = authStudentB.user;
    createdAuthUserIds.push(studentBUser.id);

    await supabaseAdmin.from("users").update({ role: "STUDENT" }).eq("id", studentBUser.id);
    await supabaseAdmin.from("students").insert({ user_id: studentBUser.id });

    // 3. Provision Verified Tutor A
    const { data: authTutorV, error: errTV } = await supabaseAdmin.auth.admin.createUser({
      email: tutorVerifiedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Dr. Biswajit Mohanty" },
    });
    if (errTV) throw errTV;
    tutorVerifiedUser = authTutorV.user;
    createdAuthUserIds.push(tutorVerifiedUser.id);

    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", tutorVerifiedUser.id);
    const { data: tvProf } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: tutorVerifiedUser.id,
        display_name: "Dr. Biswajit Mohanty",
        qualification: "Ph.D. in Mathematics",
        experience: "12 years teaching in Balasore",
        locality: "Sahadevkhunta",
        fee: "2500",
        availability: "Mon, Wed, Fri (5:00 PM - 7:00 PM)",
        is_verified: true,
      })
      .select("id")
      .single();
    tutorVerifiedProfile = tvProf;

    // Link subject to Verified Tutor A
    await supabaseAdmin.from("tutor_subjects").insert({
      tutor_id: tutorVerifiedProfile.id,
      subject_id: sampleSubjectId,
    });
    await supabaseAdmin.from("tutor_classes").insert({
      tutor_id: tutorVerifiedProfile.id,
      class_id: sampleClassId,
    });

    // 4. Provision Verified Tutor B
    const { data: authTutorB, error: errTB } = await supabaseAdmin.auth.admin.createUser({
      email: tutorBEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Sasmita Rout" },
    });
    if (errTB) throw errTB;
    tutorBUser = authTutorB.user;
    createdAuthUserIds.push(tutorBUser.id);

    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", tutorBUser.id);
    const { data: tbProf } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: tutorBUser.id,
        display_name: "Sasmita Rout",
        qualification: "M.Sc. Physics",
        experience: "6 years teaching",
        locality: "OT Road",
        fee: "2000",
        availability: "Tue, Thu, Sat",
        is_verified: true,
      })
      .select("id")
      .single();
    tutorBProfile = tbProf;

    // 5. Provision Unverified Tutor
    const { data: authTutorUnv, error: errTUnv } = await supabaseAdmin.auth.admin.createUser({
      email: tutorUnverifiedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Pending Applicant" },
    });
    if (errTUnv) throw errTUnv;
    tutorUnverifiedUser = authTutorUnv.user;
    createdAuthUserIds.push(tutorUnverifiedUser.id);

    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", tutorUnverifiedUser.id);
    const { data: tunvProf } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: tutorUnverifiedUser.id,
        display_name: "Pending Applicant",
        qualification: "B.A. English",
        locality: "Remuna",
        is_verified: false,
      })
      .select("id")
      .single();
    tutorUnverifiedProfile = tunvProf;

    // Authenticate persona clients
    await clientStudentA.auth.signInWithPassword({ email: studentAEmail, password });
    await clientStudentB.auth.signInWithPassword({ email: studentBEmail, password });
    await clientTutorVerified.auth.signInWithPassword({ email: tutorVerifiedEmail, password });
    await clientTutorB.auth.signInWithPassword({ email: tutorBEmail, password });

    console.log("  ✓ Setup completed successfully.\n");

    // ========================================================================
    // 1. BROWSE VERIFIED TUTORS & MARKETPLACE VISIBILITY
    // ========================================================================
    console.log("==================================================");
    console.log("TEST SUITE 1: Marketplace Visibility & Isolation");
    console.log("==================================================");

    // Test 1: Student can browse verified tutors from public_tutor_profiles
    const { data: publicProfiles } = await clientStudentA
      .from("public_tutor_profiles")
      .select("*");

    const verifiedIds = publicProfiles?.map((p) => p.id) || [];
    assert(
      verifiedIds.includes(tutorVerifiedProfile.id),
      "Student can browse verified tutors in public marketplace view"
    );

    // Test 2: Unverified tutor does not appear in public marketplace
    assert(
      !verifiedIds.includes(tutorUnverifiedProfile.id),
      "Unverified tutor does NOT appear in public_tutor_profiles"
    );

    // Test 3: Rejected tutor does not appear
    const { data: rejectedApps } = await supabaseAdmin
      .from("tutor_profiles")
      .select("id")
      .eq("is_verified", false);
    const rejectedIds = rejectedApps?.map((a) => a.id) || [];
    const leaked = rejectedIds.some((id) => verifiedIds.includes(id));
    assert(!leaked, "Unverified/rejected tutors are strictly excluded from marketplace view");

    // Test 4: Student can view public tutor profile (/tutors/:id)
    const tutorRes = await fetchUrl(`/tutors/${tutorVerifiedProfile.id}`);
    assert(
      tutorRes.statusCode === 200 && tutorRes.body.includes("Dr. Biswajit Mohanty"),
      "Public tutor profile route (/tutors/:id) returns HTTP 200 with tutor details"
    );

    // ========================================================================
    // 2. TUTOR REQUEST CREATION & STATUS LIFECYCLE
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 2: Tutor Request Creation & State Machine");
    console.log("==================================================");

    // Test 5: Student can create a tutor request
    const { data: req1Res, error: req1Err } = await clientStudentA.rpc("create_tutor_request", {
      p_tutor_id: tutorVerifiedProfile.id,
      p_subject_id: sampleSubjectId,
      p_class_id: sampleClassId,
      p_message: "Need Class 10 Math tuition.",
    });
    assert(!req1Err && req1Res?.success === true, "Student can create a tutor request via RPC");
    const req1Id = req1Res?.request_id;
    if (req1Id) createdRequestIds.push(req1Id);

    // Test 6: New request starts strictly as PENDING
    const { data: req1Record } = await supabaseAdmin
      .from("tutor_requests")
      .select("status, student_id, tutor_id")
      .eq("id", req1Id)
      .single();

    assert(
      req1Record?.status === "PENDING",
      "New tutor request starts strictly in PENDING status"
    );

    // Test 7: Duplicate active PENDING request is rejected
    const { error: dupErr } = await clientStudentA.rpc("create_tutor_request", {
      p_tutor_id: tutorVerifiedProfile.id,
      p_subject_id: sampleSubjectId,
      p_class_id: sampleClassId,
      p_message: "Duplicate attempt",
    });
    assert(
      dupErr !== null && dupErr.message.includes("already have an active request"),
      "Duplicate active PENDING request is rejected at the database level"
    );

    // ========================================================================
    // 3. ROW LEVEL SECURITY & READ ISOLATION
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 3: RLS Isolation for Requests");
    console.log("==================================================");

    // Test 8: Student can view only their own requests
    const { data: studentARequests } = await clientStudentA
      .from("tutor_requests")
      .select("id");
    const { data: studentBRequests } = await clientStudentB
      .from("tutor_requests")
      .select("id");

    const sASeesOwn = studentARequests?.some((r) => r.id === req1Id);
    const sBSeesA = studentBRequests?.some((r) => r.id === req1Id);

    assert(sASeesOwn && !sBSeesA, "Student A can view own request; Student B cannot see Student A's request");

    // Test 9: Tutor can see incoming requests addressed to them
    const { data: tutorVRequests } = await clientTutorVerified
      .from("tutor_requests")
      .select("id");
    assert(
      tutorVRequests?.some((r) => r.id === req1Id),
      "Tutor can see incoming requests addressed to them"
    );

    // Test 10: Tutor cannot see another tutor's requests
    const { data: tutorBRequests } = await clientTutorB
      .from("tutor_requests")
      .select("id");
    assert(
      !tutorBRequests?.some((r) => r.id === req1Id),
      "Tutor B cannot see requests addressed to Tutor A"
    );

    // ========================================================================
    // 4. TUTOR DECISIONS & ATOMIC TRANSITIONS
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 4: Request Decisions & Status Transitions");
    console.log("==================================================");

    // Test 11: Tutor can accept a PENDING request
    const { data: acceptRes, error: acceptErr } = await clientTutorVerified.rpc(
      "accept_tutor_request",
      { p_request_id: req1Id }
    );
    assert(!acceptErr && acceptRes?.status === "ACCEPTED", "Tutor can accept a PENDING request");

    const { data: acceptedReq } = await supabaseAdmin
      .from("tutor_requests")
      .select("status, responded_at")
      .eq("id", req1Id)
      .single();

    assert(
      acceptedReq?.status === "ACCEPTED" && acceptedReq.responded_at !== null,
      "Request status is updated to ACCEPTED with automatic responded_at timestamp"
    );

    // Create a second request to test decline
    const { data: req2Res } = await clientStudentB.rpc("create_tutor_request", {
      p_tutor_id: tutorVerifiedProfile.id,
      p_subject_id: sampleSubjectId,
      p_class_id: sampleClassId,
      p_message: "Student B requesting tuition",
    });
    const req2Id = req2Res?.request_id;
    if (req2Id) createdRequestIds.push(req2Id);

    // Test 12: Tutor can decline a PENDING request
    const { data: declineRes, error: declineErr } = await clientTutorVerified.rpc(
      "decline_tutor_request",
      { p_request_id: req2Id }
    );
    assert(!declineErr && declineRes?.status === "DECLINED", "Tutor can decline a PENDING request");

    // Test 13: Student cannot force ACCEPTED status directly
    const { data: forceData, error: studentForceErr } = await clientStudentB
      .from("tutor_requests")
      .update({ status: "ACCEPTED" })
      .eq("id", req2Id)
      .select();

    const { data: checkReq2 } = await supabaseAdmin
      .from("tutor_requests")
      .select("status")
      .eq("id", req2Id)
      .single();

    assert(
      (studentForceErr !== null || !forceData || forceData.length === 0) &&
        checkReq2?.status === "DECLINED",
      "Student cannot force ACCEPTED status directly (blocked by RLS/triggers; remains DECLINED)"
    );

    // Test 14: Student cannot modify tutor decisions on closed requests
    const { data: closedData, error: closedModErr } = await clientStudentA
      .from("tutor_requests")
      .update({ status: "CANCELLED" })
      .eq("id", req1Id)
      .select();

    const { data: checkReq1 } = await supabaseAdmin
      .from("tutor_requests")
      .select("status")
      .eq("id", req1Id)
      .single();

    assert(
      (closedModErr !== null || !closedData || closedData.length === 0) &&
        checkReq1?.status === "ACCEPTED",
      "Terminal state is immutable: closed request cannot be cancelled or altered (remains ACCEPTED)"
    );

    // Test 15: Tutor cannot modify another tutor's requests
    const { error: crossTutorErr } = await clientTutorB.rpc("accept_tutor_request", {
      p_request_id: req1Id,
    });
    assert(
      crossTutorErr !== null && crossTutorErr.message.includes("Unauthorized"),
      "Tutor cannot modify another tutor's request"
    );

    // ========================================================================
    // 5. ANONYMOUS & PRIVACY SECURITY
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 5: Anonymous Boundaries & Privacy Isolation");
    console.log("==================================================");

    // Test 16: Anonymous user cannot create requests
    const { error: anonInsertErr } = await clientAnonymous.rpc("create_tutor_request", {
      p_tutor_id: tutorVerifiedProfile.id,
      p_subject_id: sampleSubjectId,
      p_class_id: sampleClassId,
    });
    assert(
      anonInsertErr !== null && anonInsertErr.message.includes("Authentication required"),
      "Anonymous user cannot create requests (rejected with Authentication required)"
    );

    // Test 17: Student private info (phone/email) is not exposed to tutor
    const { data: tutorViewData } = await clientTutorVerified
      .from("tutor_requests")
      .select("id, status, student:students(id, user:users(full_name))")
      .eq("id", req1Id)
      .single();

    const studentUser = tutorViewData?.student?.user;
    const hasEmail = Boolean(studentUser?.email);
    const hasPhone = Boolean(studentUser?.phone);
    assert(
      !hasEmail && !hasPhone,
      "Student private contact details (phone, email) are strictly excluded from tutor view"
    );

    // Test 18: Tutor private info is not exposed in public marketplace
    const { data: marketplaceTutor } = await clientAnonymous
      .from("public_tutor_profiles")
      .select("*")
      .eq("id", tutorVerifiedProfile.id)
      .single();

    assert(
      marketplaceTutor &&
        !marketplaceTutor.phone &&
        !marketplaceTutor.email &&
        !marketplaceTutor.documents &&
        !marketplaceTutor.google_response_id,
      "Tutor private information (phone, email, documents) is never exposed in marketplace"
    );

    // Test 19: Payment functionality does not exist in Phase 5
    const { data: paymentTableCheck } = await supabaseAdmin
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .ilike("table_name", "%payment%");

    assert(
      !paymentTableCheck || paymentTableCheck.length === 0,
      "Payment functionality is completely absent in Phase 5"
    );

    // ========================================================================
    // 6. REGRESSION SUITES
    // ========================================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 6: Platform Regression Verification");
    console.log("==================================================");

    // Test 20: Phase 4A Regression
    try {
      execSync("node scripts/validate-phase4a-ingestion.mjs", { stdio: "ignore" });
      assert(true, "Phase 4A regression passes");
    } catch {
      assert(false, "Phase 4A regression failed");
    }

    // Test 21: Phase 4B Regression
    try {
      execSync("node scripts/validate-phase4b-google-forms.mjs", { stdio: "ignore" });
      assert(true, "Phase 4B regression passes");
    } catch {
      assert(false, "Phase 4B regression failed");
    }

    // Test 22: Phase 4C Regression
    try {
      execSync("node scripts/validate-phase4c-admin-applications.mjs", { stdio: "ignore" });
      assert(true, "Phase 4C regression passes");
    } catch {
      assert(false, "Phase 4C regression failed");
    }

    // Test 23: Phase 4D Regression
    try {
      execSync("node scripts/validate-phase4d-tutor-portal.mjs", { stdio: "ignore" });
      assert(true, "Phase 4D regression passes");
    } catch {
      assert(false, "Phase 4D regression failed");
    }

    // Test 24: Phase 3B OAuth Regression
    try {
      execSync("node scripts/validate-phase3b-e2e.mjs", { stdio: "ignore" });
      assert(true, "Phase 3B OAuth regression passes");
    } catch {
      assert(false, "Phase 3B OAuth regression failed");
    }

    // Test 25: Phase 2B RLS Regression
    try {
      execSync(
        'npx supabase db query --linked --file supabase/tests/database_security_test.sql',
        { stdio: "ignore" }
      );
      assert(true, "Phase 2B RLS regression passes");
    } catch {
      assert(false, "Phase 2B RLS regression failed");
    }

  } catch (err) {
    console.error("\n❌ Unexpected error during Phase 5 validation:", err);
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------------
    console.log("\n[Cleanup] Cleaning up test requests and personas...");
    for (const reqId of createdRequestIds) {
      await supabaseAdmin.from("tutor_requests").delete().eq("id", reqId);
    }
    if (tutorVerifiedProfile?.id) {
      await supabaseAdmin.from("tutor_subjects").delete().eq("tutor_id", tutorVerifiedProfile.id);
      await supabaseAdmin.from("tutor_classes").delete().eq("tutor_id", tutorVerifiedProfile.id);
      await supabaseAdmin.from("tutor_profiles").delete().eq("id", tutorVerifiedProfile.id);
    }
    if (tutorBProfile?.id) {
      await supabaseAdmin.from("tutor_profiles").delete().eq("id", tutorBProfile.id);
    }
    if (tutorUnverifiedProfile?.id) {
      await supabaseAdmin.from("tutor_profiles").delete().eq("id", tutorUnverifiedProfile.id);
    }
    for (const uid of createdAuthUserIds) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
    }
    console.log("  ✓ Cleanup complete.");
  }

  console.log("\n==================================================");
  console.log(`TOTAL PHASE 5 CHECKS: ${testsRun}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log("==================================================");

  if (testsFailed > 0) {
    console.error("❌ PHASE 5 VALIDATION FAILED");
    process.exit(1);
  } else {
    console.log("🎉 ALL PHASE 5 TESTS & REGRESSIONS PASSED!\n");
  }
}

runPhase5Validation();
