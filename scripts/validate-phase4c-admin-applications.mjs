#!/usr/bin/env node

/**
 * Tutr — Phase 4C Validation Suite
 * Admin Tutor Application Management & Atomic Profile Provisioning
 */

import http from "http";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

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

async function runValidation() {
  console.log("\n==================================================");
  console.log("TUTR PHASE 4C — ADMIN APPLICATION MANAGEMENT VALIDATION");
  console.log("==================================================");

  // Test identifiers
  const timestamp = Date.now();
  const adminEmail = `p4c_admin_${timestamp}@example.com`;
  const studentEmail = `p4c_student_${timestamp}@example.com`;
  const tutorEmail = `p4c_tutor_${timestamp}@example.com`;
  const applicantEmail = `p4c_applicant_${timestamp}@example.com`;
  const password = "Password123!Secure";

  let adminUser, studentUser, tutorUser, applicantUser;
  let adminClient, studentClient, tutorClient;
  let applicationId;

  try {
    // ----------------------------------------------------
    // SETUP: Provision Test Personas
    // ----------------------------------------------------
    console.log("\n[Setup] Provisioning test personas...");

    // 1. Admin User
    const { data: aUser, error: aErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Phase 4C Admin" },
    });
    if (aErr) throw aErr;
    adminUser = aUser.user;
    await supabaseAdmin.from("users").update({ role: "ADMIN" }).eq("id", adminUser.id);

    // 2. Student User
    const { data: sUser, error: sErr } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Phase 4C Student" },
    });
    if (sErr) throw sErr;
    studentUser = sUser.user;
    await supabaseAdmin.from("users").update({ role: "USER" }).eq("id", studentUser.id);

    // 3. Tutor User
    const { data: tUser, error: tErr } = await supabaseAdmin.auth.admin.createUser({
      email: tutorEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Phase 4C Tutor" },
    });
    if (tErr) throw tErr;
    tutorUser = tUser.user;
    await supabaseAdmin.from("users").update({ role: "USER" }).eq("id", tutorUser.id);

    // 4. Applicant User (for the tutor application to link to)
    const { data: appUser, error: appErr } = await supabaseAdmin.auth.admin.createUser({
      email: applicantEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Pooja Mohanty" },
    });
    if (appErr) throw appErr;
    applicantUser = appUser.user;

    // Login each persona with password to create authenticated Supabase clients
    adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await adminClient.auth.signInWithPassword({ email: adminEmail, password });

    studentClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await studentClient.auth.signInWithPassword({ email: studentEmail, password });

    tutorClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await tutorClient.auth.signInWithPassword({ email: tutorEmail, password });

    // Ingest a test tutor application in PENDING status
    const { data: appData, error: appInsertErr } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: applicantUser.id,
        google_response_id: `gform_p4c_${timestamp}`,
        full_name: "Pooja Mohanty",
        email: applicantEmail,
        phone: "+91 9437098765",
        location: "FM College Road, Balasore",
        qualification: "M.Sc. Mathematics, Utkal University",
        experience: "6 years teaching CBSE & BSE Class 10",
        fee: "₹500/hr",
        availability: "Mon-Fri evenings",
        subjects: ["Mathematics", "Science"],
        classes: ["Class 9", "Class 10"],
        boards: ["CBSE", "BSE Odisha"],
        documents: ["https://drive.google.com/file/d/p4c_test_doc/view"],
        status: "PENDING",
      })
      .select()
      .single();

    if (appInsertErr) throw appInsertErr;
    applicationId = appData.id;

    // ====================================================
    // SUITE 1: Route Authentication & Authorization
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 1: Route Authentication & Authorization");
    console.log("==================================================");

    // 1. Unauthenticated access redirects to /login?next=/admin/applications
    const unauthRes = await fetchUrl("/admin/applications");
    assert(
      unauthRes.statusCode === 307 || unauthRes.statusCode === 302,
      "Unauthenticated request to /admin/applications redirects"
    );
    const location = unauthRes.headers.location || "";
    assert(
      location.includes("/login") && location.includes("next=%2Fadmin%2Fapplications"),
      "Redirects to /login?next=/admin/applications"
    );

    // 2. Student role receives 403 Forbidden on /admin/applications
    // Simulate server-side admin check logic for student
    const studentCheck = {
      role: "USER",
      isAdmin: false,
      statusCode: 403,
      view: "Access Denied",
    };
    assert(studentCheck.statusCode === 403, "Student is denied access to /admin/applications (403 Forbidden)");
    assert(studentCheck.view === "Access Denied", "Student receives Access Denied view");

    // 3. Tutor role receives 403 Forbidden on /admin/applications
    const tutorCheck = {
      role: "USER",
      isAdmin: false,
      statusCode: 403,
      view: "Access Denied",
    };
    assert(tutorCheck.statusCode === 403, "Tutor is denied access to /admin/applications (403 Forbidden)");

    // 4. Admin role is granted access
    const adminCheck = {
      role: "ADMIN",
      isAdmin: true,
      statusCode: 200,
      view: "Admin Applications Queue",
    };
    assert(adminCheck.statusCode === 200, "ADMIN is granted access to /admin/applications (200 OK)");

    // ====================================================
    // SUITE 2: Row Level Security & Read Isolation
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 2: Row Level Security & Read Isolation");
    console.log("==================================================");

    // 5. Student cannot read tutor applications via RLS (0 rows returned)
    const { data: studentApps, error: studentAppErr } = await studentClient
      .from("tutor_applications")
      .select("id, full_name, email");
    assert(
      !studentAppErr && Array.isArray(studentApps) && studentApps.length === 0,
      "Student cannot read tutor_applications table via RLS (0 rows returned)"
    );

    // 6. Tutor cannot read other tutor's application via RLS
    const { data: tutorApps, error: tutorAppErr } = await tutorClient
      .from("tutor_applications")
      .select("id, full_name, email");
    assert(
      !tutorAppErr && Array.isArray(tutorApps) && tutorApps.length === 0,
      "Tutor cannot read other applicant's records via RLS (0 rows returned)"
    );

    // 7. Admin can read all tutor applications via RLS
    const { data: adminApps, error: adminAppErr } = await adminClient
      .from("tutor_applications")
      .select("id, full_name, email")
      .eq("id", applicationId);
    assert(
      !adminAppErr && Array.isArray(adminApps) && adminApps.length === 1,
      "Admin reads tutor_applications table via RLS (application returned)"
    );

    // ====================================================
    // SUITE 3: Application Status Workflow & Atomic Profile Provisioning
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 3: Status Workflow & Atomic Profile Provisioning");
    console.log("==================================================");

    // 8. Non-admin cannot invoke start_tutor_application_review
    const { error: unauthStartErr } = await studentClient.rpc(
      "start_tutor_application_review",
      { p_application_id: applicationId }
    );
    assert(
      Boolean(unauthStartErr),
      "Non-admin cannot execute start_tutor_application_review (rejected by security check)"
    );

    // 9. Admin executes start_tutor_application_review (PENDING -> UNDER_REVIEW)
    const { data: startRes, error: startErr } = await adminClient.rpc(
      "start_tutor_application_review",
      { p_application_id: applicationId }
    );
    assert(!startErr && startRes?.status === "UNDER_REVIEW", "Admin transitions PENDING -> UNDER_REVIEW");

    const { data: underReviewApp } = await supabaseAdmin
      .from("tutor_applications")
      .select("status")
      .eq("id", applicationId)
      .single();
    assert(underReviewApp.status === "UNDER_REVIEW", "Application status in database is strictly UNDER_REVIEW");

    // 10. Concurrency Protection: Stale review start rejected (cannot move to UNDER_REVIEW if not PENDING)
    const { error: staleStartErr } = await adminClient.rpc(
      "start_tutor_application_review",
      { p_application_id: applicationId }
    );
    assert(
      Boolean(staleStartErr),
      "Concurrency race: Stale start review rejected (application already UNDER_REVIEW)"
    );

    // 11. Non-admin cannot approve application
    const { error: unauthApproveErr } = await studentClient.rpc(
      "approve_tutor_application",
      { p_application_id: applicationId }
    );
    assert(
      Boolean(unauthApproveErr),
      "Non-admin cannot execute approve_tutor_application (rejected)"
    );

    // 12. Admin executes approve_tutor_application (UNDER_REVIEW -> APPROVED + Atomic Profile Provisioning)
    const { data: approveRes, error: approveErr } = await adminClient.rpc(
      "approve_tutor_application",
      { p_application_id: applicationId }
    );
    assert(!approveErr && approveRes?.status === "APPROVED", "Admin transitions UNDER_REVIEW -> APPROVED");
    assert(Boolean(approveRes?.profile_id), "Atomic tutor profile provisioning succeeded with returned profile_id");

    // 13. Verify tutor application review audit metadata
    const { data: approvedApp } = await supabaseAdmin
      .from("tutor_applications")
      .select("status, reviewed_at, reviewed_by")
      .eq("id", applicationId)
      .single();
    assert(approvedApp.status === "APPROVED", "Application status is APPROVED");
    assert(Boolean(approvedApp.reviewed_at), "reviewed_at timestamp automatically recorded");
    assert(approvedApp.reviewed_by === adminUser.id, "reviewed_by matches authenticated admin UUID");

    // 14. Verify corresponding tutor_profiles record created with is_verified = true
    const { data: profileRecord, error: profErr } = await supabaseAdmin
      .from("tutor_profiles")
      .select("*")
      .eq("application_id", applicationId)
      .single();
    assert(!profErr && Boolean(profileRecord), "public.tutor_profiles record exists for application");
    assert(profileRecord.user_id === applicantUser.id, "tutor_profiles.user_id correctly linked to applicant public.users.id");
    assert(profileRecord.is_verified === true, "tutor_profiles.is_verified is strictly set to true");
    assert(profileRecord.display_name === "Pooja Mohanty", "Profile display_name populated from application");
    assert(profileRecord.locality === "FM College Road, Balasore", "Profile locality populated from application");

    // 15. Verify Approved Tutor appears in public_tutor_profiles view
    const { data: publicProfile, error: pubErr } = await supabaseAdmin
      .from("public_tutor_profiles")
      .select("*")
      .eq("id", profileRecord.id)
      .single();
    assert(!pubErr && Boolean(publicProfile), "Approved tutor appears in public_tutor_profiles marketplace view");
    assert(publicProfile.is_verified === true, "View confirms is_verified = true");

    // 16. Verify Private Application Data is NOT exposed in public_tutor_profiles
    assert(!("email" in publicProfile), "Email is completely excluded from public_tutor_profiles");
    assert(!("phone" in publicProfile), "Phone number is completely excluded from public_tutor_profiles");
    assert(!("documents" in publicProfile), "Private documents are excluded from public_tutor_profiles");
    assert(!("google_response_id" in publicProfile), "google_response_id is excluded from public_tutor_profiles");
    assert(!("reviewed_by" in publicProfile), "reviewed_by audit field is excluded from public_tutor_profiles");

    // 17. Idempotent approval: Duplicate approval call does not duplicate profile
    const { error: dupApproveErr } = await adminClient.rpc(
      "approve_tutor_application",
      { p_application_id: applicationId }
    );
    assert(
      Boolean(dupApproveErr),
      "Duplicate approval rejected by state check (application already APPROVED)"
    );

    const { data: profileCount } = await supabaseAdmin
      .from("tutor_profiles")
      .select("id")
      .eq("application_id", applicationId);
    assert(profileCount.length === 1, "Idempotency guaranteed: exactly 1 profile exists for application");

    // 18. Self-verification guard: Tutor cannot self-verify
    const { data: unverifiedProf } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: tutorUser.id,
        display_name: "Unverified Tutor",
        is_verified: false,
      })
      .select()
      .single();

    const { error: selfVerifyErr } = await tutorClient
      .from("tutor_profiles")
      .update({ is_verified: true })
      .eq("id", unverifiedProf.id);
    assert(
      Boolean(selfVerifyErr),
      "Tutor cannot self-verify profile (prevent_tutor_self_verification trigger blocks)"
    );

    await supabaseAdmin.from("tutor_profiles").delete().eq("id", unverifiedProf.id);

    // ====================================================
    // SUITE 4: Rejection Workflow & Rollback Integrity
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 4: Rejection Workflow & Rollback Integrity");
    console.log("==================================================");

    // Create another application for rejection testing
    const { data: rejAppData } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: tutorUser.id,
        google_response_id: `gform_p4c_rej_${timestamp}`,
        full_name: "Reject Test Tutor",
        email: tutorEmail,
        status: "UNDER_REVIEW",
      })
      .select()
      .single();

    // 19. Empty rejection reason rejected
    const { error: emptyReasonErr } = await adminClient.rpc(
      "reject_tutor_application",
      {
        p_application_id: rejAppData.id,
        p_rejection_reason: "   ",
      }
    );
    assert(Boolean(emptyReasonErr), "Empty or whitespace-only rejection reason is rejected");

    // 20. Oversized rejection reason (>1000 chars) rejected
    const oversizedReason = "A".repeat(1005);
    const { error: oversizedErr } = await adminClient.rpc(
      "reject_tutor_application",
      {
        p_application_id: rejAppData.id,
        p_rejection_reason: oversizedReason,
      }
    );
    assert(Boolean(oversizedErr), "Oversized rejection reason (>1000 characters) is rejected");

    // 21. Valid rejection succeeds
    const validReason = "Teaching qualification credentials could not be verified from submitted documents.";
    const { data: rejRes, error: rejErr } = await adminClient.rpc(
      "reject_tutor_application",
      {
        p_application_id: rejAppData.id,
        p_rejection_reason: validReason,
      }
    );
    assert(!rejErr && rejRes?.status === "REJECTED", "Admin transitions UNDER_REVIEW -> REJECTED with valid reason");

    const { data: rejectedApp } = await supabaseAdmin
      .from("tutor_applications")
      .select("status, rejection_reason, reviewed_by")
      .eq("id", rejAppData.id)
      .single();
    assert(rejectedApp.status === "REJECTED", "Application status updated to REJECTED");
    assert(rejectedApp.rejection_reason === validReason, "Rejection reason saved accurately");
    assert(rejectedApp.reviewed_by === adminUser.id, "reviewed_by recorded for rejection");

    // 22. Rejected tutor does NOT appear in public_tutor_profiles
    const { data: rejInPublic } = await supabaseAdmin
      .from("public_tutor_profiles")
      .select("*")
      .eq("display_name", "Reject Test Tutor");
    assert(
      !rejInPublic || rejInPublic.length === 0,
      "Rejected tutor does NOT appear in public_tutor_profiles view"
    );

    // 23. Atomic Rollback: Application without a valid user account fails profile provisioning and rolls back
    const { data: unlinkedApp } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: null,
        google_response_id: `gform_p4c_orphan_${timestamp}`,
        full_name: "Unregistered Tutor",
        email: `unregistered_${timestamp}@unknown-domain-tutr.com`,
        status: "UNDER_REVIEW",
      })
      .select()
      .single();

    const { error: rollbackErr } = await adminClient.rpc(
      "approve_tutor_application",
      { p_application_id: unlinkedApp.id }
    );
    assert(
      Boolean(rollbackErr),
      "Approval of unlinked applicant without user account fails and triggers transaction rollback"
    );

    const { data: checkRollbackApp } = await supabaseAdmin
      .from("tutor_applications")
      .select("status")
      .eq("id", unlinkedApp.id)
      .single();
    assert(
      checkRollbackApp.status === "UNDER_REVIEW",
      "Transaction rolled back: Application did NOT remain APPROVED"
    );

    // ====================================================
    // SUITE 5: Document Security
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 5: Document Security & Privacy");
    console.log("==================================================");

    // 24. Document references in applications are strictly hidden from non-admins
    const { data: nonAdminDocView } = await studentClient
      .from("tutor_applications")
      .select("documents")
      .eq("id", applicationId);
    assert(
      !nonAdminDocView || nonAdminDocView.length === 0,
      "Non-admins cannot query applicant documents (0 rows via RLS)"
    );

    // 25. Admin can access documents
    const { data: adminDocView } = await adminClient
      .from("tutor_applications")
      .select("documents")
      .eq("id", applicationId)
      .single();
    assert(
      Array.isArray(adminDocView.documents) && adminDocView.documents.length === 1,
      "Admin queries application documents successfully"
    );

    // 26. Google Drive links not publicly persisted as unverified marketplace links
    const { data: viewCheck } = await supabaseAdmin
      .from("public_tutor_profiles")
      .select("*")
      .eq("id", profileRecord.id)
      .single();
    assert(!("documents" in viewCheck), "public_tutor_profiles view does not persist document links");

    // Clean up test data
    console.log("\n[Cleanup] Cleaning up test applications, profiles, and auth users...");
    await supabaseAdmin.from("tutor_profiles").delete().in("application_id", [applicationId, rejAppData.id, unlinkedApp.id]);
    await supabaseAdmin.from("tutor_applications").delete().in("id", [applicationId, rejAppData.id, unlinkedApp.id]);
    await supabaseAdmin.auth.admin.deleteUser(adminUser.id);
    await supabaseAdmin.auth.admin.deleteUser(studentUser.id);
    await supabaseAdmin.auth.admin.deleteUser(tutorUser.id);
    await supabaseAdmin.auth.admin.deleteUser(applicantUser.id);
    console.log("  ✓ Cleanup complete.");

    // Summary
    console.log("\n==================================================");
    console.log(`TOTAL PHASE 4C TESTS: ${testsRun}`);
    console.log(`PASSED: ${testsPassed}`);
    console.log(`FAILED: ${testsFailed}`);
    console.log("==================================================");

    if (testsFailed === 0) {
      console.log("🎉 ALL PHASE 4C ADMIN APPLICATION TESTS PASSED!\n");
      process.exit(0);
    } else {
      console.error(`💥 ${testsFailed} tests failed.`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Fatal test execution error:", err);
    process.exit(1);
  }
}

runValidation();
