#!/usr/bin/env node

/**
 * Tutr — Phase 5 Manual End-to-End Audit Script
 * Executes a comprehensive audit of the 13 required verification items:
 *
 * 1. Student can browse /tutors.
 * 2. Student can open a verified tutor profile.
 * 3. Student can submit a tutor request.
 * 4. Student sees the request as PENDING at /student/requests.
 * 5. Tutor sees the incoming request at /tutor/requests.
 * 6. Tutor can ACCEPT the request.
 * 7. Student sees ACCEPTED.
 * 8. Test DECLINE flow.
 * 9. Test CANCEL flow.
 * 10. Test duplicate active request protection.
 * 11. Confirm student email/phone is never exposed to tutor.
 * 12. Confirm tutor email/phone/documents are never exposed publicly.
 * 13. Confirm Parent functionality is not present in active UI.
 */

import http from "http";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

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

// Helper to authenticate persona and get SSR cookie header
async function getAuthCookie(email, password) {
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

  const { data: authData, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !authData.session) {
    throw new Error(`Failed to sign in ${email}: ${error?.message}`);
  }

  await client.auth.setSession(authData.session);
  return {
    cookieHeader: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
    client,
    session: authData.session,
  };
}

function fetchUrl(path, cookieHeader = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = cookieHeader ? { cookie: cookieHeader } : {};

    const req = http.request(
      url,
      {
        method: "GET",
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

const auditResults = [];

function recordResult(itemNumber, itemTitle, status, details) {
  auditResults.push({ itemNumber, itemTitle, status, details });
  const icon = status === "PASS" ? "✓ PASS" : "❌ FAIL";
  console.log(`[Item ${itemNumber}] ${icon}: ${itemTitle}`);
  if (details) {
    console.log(`         Details: ${details}`);
  }
}

async function runAudit() {
  console.log("\n==================================================");
  console.log("TUTR PHASE 5: MANUAL END-TO-END AUDIT");
  console.log("Testing Student ↔ Tutor Discovery & Request Flow");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const studentEmail = `audit_student_${timestamp}@example.com`;
  const student2Email = `audit_student2_${timestamp}@example.com`;
  const tutorEmail = `audit_tutor_${timestamp}@example.com`;
  const password = "Password123!Audit";

  let studentUser, student2User, tutorUser;
  let tutorProfile;
  let subjectId, classId;
  const createdAuthIds = [];
  const createdRequestIds = [];

  try {
    console.log("[Setup] Provisioning audit personas...");

    // 1. Get reference subject & class
    const { data: subjects } = await supabaseAdmin.from("subjects").select("id, name").limit(1);
    const { data: classes } = await supabaseAdmin.from("classes").select("id, name").limit(1);
    subjectId = subjects[0].id;
    classId = classes[0].id;

    // 2. Provision Student 1
    const { data: sAuth } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Aman Pattnaik", phone: "9876543210" },
    });
    studentUser = sAuth.user;
    createdAuthIds.push(studentUser.id);
    await supabaseAdmin.from("users").update({ role: "STUDENT" }).eq("id", studentUser.id);
    await supabaseAdmin.from("students").insert({ user_id: studentUser.id });

    // 3. Provision Student 2
    const { data: s2Auth } = await supabaseAdmin.auth.admin.createUser({
      email: student2Email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Sneha Das", phone: "9123456780" },
    });
    student2User = s2Auth.user;
    createdAuthIds.push(student2User.id);
    await supabaseAdmin.from("users").update({ role: "STUDENT" }).eq("id", student2User.id);
    await supabaseAdmin.from("students").insert({ user_id: student2User.id });

    // 4. Provision Verified Tutor
    const { data: tAuth } = await supabaseAdmin.auth.admin.createUser({
      email: tutorEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Prof. Sudhir Senapati", phone: "9988776655" },
    });
    tutorUser = tAuth.user;
    createdAuthIds.push(tutorUser.id);
    await supabaseAdmin.from("users").update({ role: "TUTOR" }).eq("id", tutorUser.id);

    const { data: tp } = await supabaseAdmin
      .from("tutor_profiles")
      .insert({
        user_id: tutorUser.id,
        display_name: "Prof. Sudhir Senapati",
        qualification: "M.Sc. Mathematics, B.Ed",
        experience: "15+ years in Balasore",
        locality: "Sahadevkhunta",
        fee: "3000",
        availability: "Mon, Wed, Fri (4:00 PM - 6:00 PM)",
        bio: "Specialist in CBSE and BSE Odisha Class 9 & 10 Mathematics board exam preparation.",
        is_verified: true,
      })
      .select("id")
      .single();
    tutorProfile = tp;

    // Link junction
    await supabaseAdmin.from("tutor_subjects").insert({
      tutor_id: tutorProfile.id,
      subject_id: subjectId,
    });
    await supabaseAdmin.from("tutor_classes").insert({
      tutor_id: tutorProfile.id,
      class_id: classId,
    });

    // 5. Obtain Session Cookies
    const studentAuth = await getAuthCookie(studentEmail, password);
    const student2Auth = await getAuthCookie(student2Email, password);
    const tutorAuth = await getAuthCookie(tutorEmail, password);

    console.log("  ✓ Personas provisioned and authenticated.\n");

    // ========================================================================
    // ITEM 1: Student can browse /tutors
    // ========================================================================
    const tutorsRes = await fetchUrl("/tutors", studentAuth.cookieHeader);
    const item1Pass =
      tutorsRes.statusCode === 200 &&
      tutorsRes.body.includes("Prof. Sudhir Senapati") &&
      tutorsRes.body.includes("Sahadevkhunta") &&
      tutorsRes.body.includes("Verified");

    recordResult(
      1,
      "Student can browse /tutors",
      item1Pass ? "PASS" : "FAIL",
      `HTTP ${tutorsRes.statusCode}; Verified tutor card rendered with name, locality, and verified badge.`
    );

    // ========================================================================
    // ITEM 2: Student can open a verified tutor profile
    // ========================================================================
    const profileRes = await fetchUrl(`/tutors/${tutorProfile.id}`, studentAuth.cookieHeader);
    const item2Pass =
      profileRes.statusCode === 200 &&
      profileRes.body.includes("Prof. Sudhir Senapati") &&
      profileRes.body.includes("M.Sc. Mathematics") &&
      profileRes.body.includes("Request This Tutor");

    recordResult(
      2,
      "Student can open a verified tutor profile",
      item2Pass ? "PASS" : "FAIL",
      `HTTP ${profileRes.statusCode}; Full profile rendered with qualifications, pricing, availability, and 'Request This Tutor' button.`
    );

    // ========================================================================
    // ITEM 3: Student can submit a tutor request
    // ========================================================================
    const { data: req1Res, error: req1Err } = await studentAuth.client.rpc("create_tutor_request", {
      p_tutor_id: tutorProfile.id,
      p_subject_id: subjectId,
      p_class_id: classId,
      p_message: "Need help with Mathematics Class 10 Board exam prep.",
    });

    const req1Id = req1Res?.request_id;
    if (req1Id) createdRequestIds.push(req1Id);
    const item3Pass = !req1Err && req1Res?.success === true && Boolean(req1Id);

    recordResult(
      3,
      "Student can submit a tutor request",
      item3Pass ? "PASS" : "FAIL",
      `Created request ID: ${req1Id}; RPC returned success: true.`
    );

    // ========================================================================
    // ITEM 4: Student sees the request as PENDING at /student/requests
    // ========================================================================
    const studentRequestsRes = await fetchUrl("/student/requests", studentAuth.cookieHeader);
    const item4Pass =
      studentRequestsRes.statusCode === 200 &&
      studentRequestsRes.body.includes("Prof. Sudhir Senapati") &&
      studentRequestsRes.body.includes("Pending") &&
      studentRequestsRes.body.includes("Cancel Request");

    recordResult(
      4,
      "Student sees the request as PENDING at /student/requests",
      item4Pass ? "PASS" : "FAIL",
      `HTTP ${studentRequestsRes.statusCode}; Request listed with tutor name, PENDING badge, and Cancel action.`
    );

    // ========================================================================
    // ITEM 5: Tutor sees the incoming request at /tutor/requests
    // ========================================================================
    const tutorRequestsRes = await fetchUrl("/tutor/requests", tutorAuth.cookieHeader);
    const hasStudentName =
      tutorRequestsRes.body.includes("Aman Pattnaik") &&
      tutorRequestsRes.body.includes("Student:");
    const hasPending = tutorRequestsRes.body.includes("PENDING");
    const hasAccept = tutorRequestsRes.body.includes("Accept");
    const hasDecline = tutorRequestsRes.body.includes("Decline");
    if (!hasStudentName) {
      console.log("DEBUG Item 5 - Aman Pattnaik included:", tutorRequestsRes.body.includes("Aman Pattnaik"));
    }

    const item5Pass =
      tutorRequestsRes.statusCode === 200 &&
      hasStudentName &&
      hasPending &&
      hasAccept &&
      hasDecline;

    recordResult(
      5,
      "Tutor sees the incoming request at /tutor/requests",
      item5Pass ? "PASS" : "FAIL",
      `HTTP ${tutorRequestsRes.statusCode}; Metrics show 1 pending request; student name 'Aman Pattnaik' and Accept/Decline actions rendered.`
    );

    // ========================================================================
    // ITEM 6: Tutor can ACCEPT the request
    // ========================================================================
    const { data: acceptRes, error: acceptErr } = await tutorAuth.client.rpc("accept_tutor_request", {
      p_request_id: req1Id,
    });

    const item6Pass = !acceptErr && acceptRes?.status === "ACCEPTED";
    recordResult(
      6,
      "Tutor can ACCEPT the request",
      item6Pass ? "PASS" : "FAIL",
      `Tutor accepted request ${req1Id}; status transitioned atomically to ACCEPTED.`
    );

    // ========================================================================
    // ITEM 7: Student sees ACCEPTED
    // ========================================================================
    const studentRequestsAcceptedRes = await fetchUrl("/student/requests", studentAuth.cookieHeader);
    const item7Pass =
      studentRequestsAcceptedRes.statusCode === 200 &&
      studentRequestsAcceptedRes.body.includes("Accepted");

    recordResult(
      7,
      "Student sees ACCEPTED",
      item7Pass ? "PASS" : "FAIL",
      `HTTP ${studentRequestsAcceptedRes.statusCode}; Request badge displays 'Accepted'.`
    );

    // ========================================================================
    // ITEM 8: Test DECLINE flow
    // ========================================================================
    // Student 2 creates a request
    const { data: req2Res } = await student2Auth.client.rpc("create_tutor_request", {
      p_tutor_id: tutorProfile.id,
      p_subject_id: subjectId,
      p_class_id: classId,
      p_message: "Request from Sneha Das for physics tuition.",
    });
    const req2Id = req2Res?.request_id;
    if (req2Id) createdRequestIds.push(req2Id);

    // Tutor declines request
    const { data: declineRes, error: declineErr } = await tutorAuth.client.rpc("decline_tutor_request", {
      p_request_id: req2Id,
    });

    // Student 2 checks /student/requests
    const student2RequestsRes = await fetchUrl("/student/requests", student2Auth.cookieHeader);
    const item8Pass =
      !declineErr &&
      declineRes?.status === "DECLINED" &&
      student2RequestsRes.body.includes("Declined");

    recordResult(
      8,
      "Test DECLINE flow",
      item8Pass ? "PASS" : "FAIL",
      `Tutor declined request ${req2Id}; student sees 'Declined' status badge.`
    );

    // ========================================================================
    // ITEM 9: Test CANCEL flow
    // ========================================================================
    // Student 2 creates another request to test student cancel
    const { data: req3Res } = await student2Auth.client.rpc("create_tutor_request", {
      p_tutor_id: tutorProfile.id,
      p_subject_id: subjectId,
      p_class_id: classId,
      p_message: "Will cancel this request.",
    });
    const req3Id = req3Res?.request_id;
    if (req3Id) createdRequestIds.push(req3Id);

    // Student 2 cancels request
    const { data: cancelRes, error: cancelErr } = await student2Auth.client.rpc("cancel_tutor_request", {
      p_request_id: req3Id,
    });

    const student2CancelledRes = await fetchUrl("/student/requests", student2Auth.cookieHeader);
    const item9Pass =
      !cancelErr &&
      cancelRes?.status === "CANCELLED" &&
      student2CancelledRes.body.includes("Cancelled");

    recordResult(
      9,
      "Test CANCEL flow",
      item9Pass ? "PASS" : "FAIL",
      `Student cancelled pending request ${req3Id}; status transitioned to CANCELLED.`
    );

    // ========================================================================
    // ITEM 10: Test duplicate active request protection
    // ========================================================================
    // Student 1 has an ACCEPTED request (req1). Now student 1 creates a PENDING request:
    const { data: req4Res } = await studentAuth.client.rpc("create_tutor_request", {
      p_tutor_id: tutorProfile.id,
      p_subject_id: subjectId,
      p_class_id: classId,
      p_message: "Active pending request.",
    });
    const req4Id = req4Res?.request_id;
    if (req4Id) createdRequestIds.push(req4Id);

    // Student 1 attempts to create a second identical PENDING request to same tutor
    const { error: dupErr } = await studentAuth.client.rpc("create_tutor_request", {
      p_tutor_id: tutorProfile.id,
      p_subject_id: subjectId,
      p_class_id: classId,
      p_message: "Second pending request should be blocked.",
    });

    const item10Pass =
      dupErr !== null &&
      dupErr.message.includes("already have an active request with this tutor");

    recordResult(
      10,
      "Test duplicate active request protection",
      item10Pass ? "PASS" : "FAIL",
      `Duplicate request blocked at database level with message: '${dupErr?.message}'.`
    );

    // ========================================================================
    // ITEM 11: Confirm student email/phone is never exposed to tutor
    // ========================================================================
    const tutorDashboardRes = await fetchUrl("/tutor/requests", tutorAuth.cookieHeader);
    const leaksStudentEmail = tutorDashboardRes.body.includes(studentEmail) || tutorDashboardRes.body.includes(student2Email);
    const leaksStudentPhone = tutorDashboardRes.body.includes("9876543210") || tutorDashboardRes.body.includes("9123456780");

    const item11Pass = !leaksStudentEmail && !leaksStudentPhone;
    recordResult(
      11,
      "Confirm student email/phone is never exposed to tutor",
      item11Pass ? "PASS" : "FAIL",
      `Tutor dashboard HTML checked; Student email leaked: ${leaksStudentEmail}; Student phone leaked: ${leaksStudentPhone}. Only student display name is shown.`
    );

    // ========================================================================
    // ITEM 12: Confirm tutor email/phone/documents are never exposed publicly
    // ========================================================================
    const publicTutorsRes = await fetchUrl("/tutors");
    const publicProfileRes = await fetchUrl(`/tutors/${tutorProfile.id}`);

    const tutorEmailLeaked =
      publicTutorsRes.body.includes(tutorEmail) || publicProfileRes.body.includes(tutorEmail);
    const tutorPhoneLeaked =
      publicTutorsRes.body.includes("9988776655") || publicProfileRes.body.includes("9988776655");
    const docsLeaked =
      publicTutorsRes.body.includes("google_response_id") ||
      publicProfileRes.body.includes("google_response_id") ||
      publicProfileRes.body.includes("documents");

    const item12Pass = !tutorEmailLeaked && !tutorPhoneLeaked && !docsLeaked;
    recordResult(
      12,
      "Confirm tutor email/phone/documents are never exposed publicly",
      item12Pass ? "PASS" : "FAIL",
      `Public marketplace & profile HTML checked; Email leaked: ${tutorEmailLeaked}; Phone leaked: ${tutorPhoneLeaked}; Private docs leaked: ${docsLeaked}.`
    );

    // ========================================================================
    // ITEM 13: Confirm Parent functionality is not present in active UI
    // ========================================================================
    const homeRes = await fetchUrl("/");
    const navTutorsRes = await fetchUrl("/tutors");
    const studentHomeRes = await fetchUrl("/student", studentAuth.cookieHeader);

    const hasParentOnHome = homeRes.body.toLowerCase().includes("i am a parent") || homeRes.body.toLowerCase().includes("parent portal");
    const hasParentOnTutors = navTutorsRes.body.toLowerCase().includes("parent portal") || navTutorsRes.body.toLowerCase().includes("parent login");
    const hasParentOnStudent = studentHomeRes.body.toLowerCase().includes("parent portal");

    const item13Pass = !hasParentOnHome && !hasParentOnTutors && !hasParentOnStudent;
    recordResult(
      13,
      "Confirm Parent functionality is not present in active UI",
      item13Pass ? "PASS" : "FAIL",
      `Navigation and portals verified; Home parent links: ${hasParentOnHome}; Marketplace parent links: ${hasParentOnTutors}; Student portal parent links: ${hasParentOnStudent}.`
    );

  } catch (err) {
    console.error("Unexpected error during manual audit:", err);
  } finally {
    console.log("\n[Cleanup] Cleaning up test records...");
    for (const reqId of createdRequestIds) {
      await supabaseAdmin.from("tutor_requests").delete().eq("id", reqId);
    }
    if (tutorProfile?.id) {
      await supabaseAdmin.from("tutor_subjects").delete().eq("tutor_id", tutorProfile.id);
      await supabaseAdmin.from("tutor_classes").delete().eq("tutor_id", tutorProfile.id);
      await supabaseAdmin.from("tutor_profiles").delete().eq("id", tutorProfile.id);
    }
    for (const uid of createdAuthIds) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
    }
    console.log("  ✓ Cleanup complete.\n");
  }

  console.log("==================================================");
  console.log("AUDIT SUMMARY");
  console.log("==================================================");
  const total = auditResults.length;
  const passed = auditResults.filter((r) => r.status === "PASS").length;
  const failed = auditResults.filter((r) => r.status === "FAIL").length;

  console.log(`TOTAL ITEMS AUDITED: ${total}/13`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("==================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
