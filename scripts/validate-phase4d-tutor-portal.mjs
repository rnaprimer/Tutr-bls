#!/usr/bin/env node

/**
 * Tutr — Phase 4D Validation Suite
 * Tutor Application Frontend UX & Lifecycle State Rendering
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

import { createServerClient } from "@supabase/ssr";

// Helper to authenticate persona and get SSR cookie header using @supabase/ssr
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
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function runValidation() {
  console.log("\n==================================================");
  console.log("TUTR PHASE 4D — TUTOR APPLICATION FRONTEND UX VALIDATION");
  console.log("==================================================");

  const timestamp = Date.now();
  const userNoAppEmail = `p4d_noapp_${timestamp}@example.com`;
  const userPendingEmail = `p4d_pending_${timestamp}@example.com`;
  const userUnderReviewEmail = `p4d_underreview_${timestamp}@example.com`;
  const userApprovedEmail = `p4d_approved_${timestamp}@example.com`;
  const userRejectedEmail = `p4d_rejected_${timestamp}@example.com`;
  const password = "Password123!Secure";

  let userNoApp, userPending, userUnderReview, userApproved, userRejected;
  const createdAppIds = [];

  try {
    // ----------------------------------------------------
    // SETUP: Provision Test Personas
    // ----------------------------------------------------
    console.log("\n[Setup] Provisioning test personas and applications...");

    // 1. User with No Application
    const { data: u1, error: e1 } = await supabaseAdmin.auth.admin.createUser({
      email: userNoAppEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Amitabh NoApp" },
    });
    if (e1) throw e1;
    userNoApp = u1.user;

    // 2. User with PENDING application
    const { data: u2, error: e2 } = await supabaseAdmin.auth.admin.createUser({
      email: userPendingEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Sunita Pending" },
    });
    if (e2) throw e2;
    userPending = u2.user;

    const { data: appPending, error: aErr1 } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: userPending.id,
        google_response_id: `gform_p4d_pending_${timestamp}`,
        full_name: "Sunita Pending",
        email: userPendingEmail,
        phone: "+91 9437111111",
        location: "Mallikashpur, Balasore",
        qualification: "M.Sc. Physics",
        experience: "5 years",
        documents: ["https://drive.google.com/file/d/secret_doc_pending/view"],
        status: "PENDING",
      })
      .select()
      .single();
    if (aErr1) throw aErr1;
    createdAppIds.push(appPending.id);

    // 3. User with UNDER_REVIEW application
    const { data: u3, error: e3 } = await supabaseAdmin.auth.admin.createUser({
      email: userUnderReviewEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Ramesh Review" },
    });
    if (e3) throw e3;
    userUnderReview = u3.user;

    const { data: appReview, error: aErr2 } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: userUnderReview.id,
        google_response_id: `gform_p4d_review_${timestamp}`,
        full_name: "Ramesh Review",
        email: userUnderReviewEmail,
        phone: "+91 9437222222",
        location: "Aradhabazar, Balasore",
        qualification: "B.Ed. Mathematics",
        experience: "4 years",
        documents: ["https://drive.google.com/file/d/secret_doc_review/view"],
        status: "UNDER_REVIEW",
      })
      .select()
      .single();
    if (aErr2) throw aErr2;
    createdAppIds.push(appReview.id);

    // 4. User with APPROVED application
    const { data: u4, error: e4 } = await supabaseAdmin.auth.admin.createUser({
      email: userApprovedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Deepa Approved" },
    });
    if (e4) throw e4;
    userApproved = u4.user;

    const { data: appApproved, error: aErr3 } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: userApproved.id,
        google_response_id: `gform_p4d_approved_${timestamp}`,
        full_name: "Deepa Approved",
        email: userApprovedEmail,
        phone: "+91 9437333333",
        location: "OT Road, Balasore",
        qualification: "M.A. English",
        experience: "7 years",
        documents: ["https://drive.google.com/file/d/secret_doc_approved/view"],
        status: "APPROVED",
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (aErr3) throw aErr3;
    createdAppIds.push(appApproved.id);

    // 5. User with REJECTED application
    const { data: u5, error: e5 } = await supabaseAdmin.auth.admin.createUser({
      email: userRejectedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Chandan Rejected" },
    });
    if (e5) throw e5;
    userRejected = u5.user;

    const testRejectionReason = "Submitted documents were blurred and could not be verified.";
    const { data: appRejected, error: aErr4 } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: userRejected.id,
        google_response_id: `gform_p4d_rejected_${timestamp}`,
        full_name: "Chandan Rejected",
        email: userRejectedEmail,
        phone: "+91 9437444444",
        location: "Remuna, Balasore",
        qualification: "B.A. History",
        experience: "1 year",
        documents: ["https://drive.google.com/file/d/secret_doc_rejected/view"],
        status: "REJECTED",
        rejection_reason: testRejectionReason,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (aErr4) throw aErr4;
    createdAppIds.push(appRejected.id);

    console.log("  ✓ Setup completed successfully.");

    // ====================================================
    // SUITE 1: Route Protection
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 1: Route Protection & Unauthenticated Interception");
    console.log("==================================================");

    const unauthRes = await fetchUrl("/tutor");
    assert(
      unauthRes.statusCode === 307 || unauthRes.statusCode === 302,
      "Unauthenticated request to /tutor redirects (actual: " + unauthRes.statusCode + ")"
    );
    const loc = unauthRes.headers.location || "";
    assert(
      loc.includes("/login") && loc.includes("next=%2Ftutor"),
      "Redirects to /login?next=/tutor (location: " + loc + ")"
    );

    // ====================================================
    // SUITE 2: NO APPLICATION State
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 2: No Application State Rendering");
    console.log("==================================================");

    const cookieNoApp = await getAuthCookie(userNoAppEmail, password);
    const noAppRes = await fetchUrl("/tutor", {
      headers: { cookie: cookieNoApp },
    });
    assert(noAppRes.statusCode === 200, "Authenticated user with no application returns HTTP 200 OK");
    assert(noAppRes.body.includes("Become a Tutor on Tutr"), "Renders onboarding headline 'Become a Tutor on Tutr'");
    assert(noAppRes.body.includes("Balasore Tutor Community"), "Displays Balasore Tutor Community badge");
    assert(noAppRes.body.includes("Apply to Become a Tutor"), "Renders 'Apply to Become a Tutor' CTA");
    assert(noAppRes.body.includes("target=\"_blank\""), "Google Form link opens in new tab (target='_blank')");
    assert(noAppRes.body.includes("rel=\"noopener noreferrer\""), "Link includes secure rel='noopener noreferrer'");
    assert(!noAppRes.body.includes("Tutor applications are coming next"), "Placeholder text is removed");

    // ====================================================
    // SUITE 3: PENDING State
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 3: PENDING State Rendering");
    console.log("==================================================");

    const cookiePending = await getAuthCookie(userPendingEmail, password);
    const pendingRes = await fetchUrl("/tutor", {
      headers: { cookie: cookiePending },
    });
    assert(pendingRes.statusCode === 200, "User with PENDING application returns HTTP 200 OK");
    assert(pendingRes.body.includes("Application Submitted"), "Renders headline 'Application Submitted'");
    assert(pendingRes.body.includes("PENDING"), "Displays PENDING status badge");
    assert(pendingRes.body.includes("waiting for review"), "Displays waiting for review informational notice");
    assert(pendingRes.body.includes("Submitted Date"), "Displays formatted submitted date");
    assert(!pendingRes.body.includes("Apply to Become a Tutor"), "Does not render redundant apply CTA when PENDING");

    // ====================================================
    // SUITE 4: UNDER_REVIEW State
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 4: UNDER_REVIEW State Rendering");
    console.log("==================================================");

    const cookieReview = await getAuthCookie(userUnderReviewEmail, password);
    const reviewRes = await fetchUrl("/tutor", {
      headers: { cookie: cookieReview },
    });
    assert(reviewRes.statusCode === 200, "User with UNDER_REVIEW application returns HTTP 200 OK");
    assert(reviewRes.body.includes("Application Under Review"), "Renders headline 'Application Under Review'");
    assert(reviewRes.body.includes("UNDER REVIEW"), "Displays UNDER REVIEW status badge");
    assert(reviewRes.body.includes("currently reviewing your tutor application"), "Displays verification in-progress message");
    assert(!reviewRes.body.includes("reviewed_by"), "Reviewer metadata is strictly hidden");

    // ====================================================
    // SUITE 5: APPROVED State
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 5: APPROVED State Rendering");
    console.log("==================================================");

    const cookieApproved = await getAuthCookie(userApprovedEmail, password);
    const approvedUnpaidRes = await fetchUrl("/tutor", {
      headers: { cookie: cookieApproved },
    });
    assert(approvedUnpaidRes.statusCode === 200, "User with APPROVED application returns HTTP 200 OK");
    assert(
      approvedUnpaidRes.body.includes("Complete your onboarding by paying the one-time onboarding fee") ||
        approvedUnpaidRes.body.includes("Complete Onboarding"),
      "Renders onboarding payment requirement for approved unpaid tutor"
    );

    // Complete onboarding payment and activate profile for dashboard view
    await supabaseAdmin.from("tutor_onboarding_payments").insert({
      application_id: appApproved.id,
      user_id: userApproved.id,
      amount: 149,
      status: "PAID",
      paid_at: new Date().toISOString(),
    });
    await supabaseAdmin.from("tutor_profiles").update({ is_active: true }).eq("application_id", appApproved.id);

    const approvedPaidRes = await fetchUrl("/tutor", {
      headers: { cookie: cookieApproved },
    });
    assert(
      approvedPaidRes.body.includes("You&#x27;re a Verified Tutr Tutor") ||
        approvedPaidRes.body.includes("You're a Verified Tutr Tutor"),
      "Renders headline 'You're a Verified Tutr Tutor' after onboarding payment"
    );
    assert(approvedPaidRes.body.includes("APPROVED"), "Displays APPROVED status badge");
    assert(approvedPaidRes.body.includes("Tutor Dashboard"), "Displays Tutor Dashboard section");
    assert(approvedPaidRes.body.includes("Coming Soon"), "Clearly indicates 'Coming Soon'");

    // ====================================================
    // SUITE 6: REJECTED State
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 6: REJECTED State Rendering");
    console.log("==================================================");

    const cookieRejected = await getAuthCookie(userRejectedEmail, password);
    const rejectedRes = await fetchUrl("/tutor", {
      headers: { cookie: cookieRejected },
    });
    assert(rejectedRes.statusCode === 200, "User with REJECTED application returns HTTP 200 OK");
    assert(rejectedRes.body.includes("Application Not Approved"), "Renders headline 'Application Not Approved'");
    assert(rejectedRes.body.includes("REJECTED"), "Displays REJECTED status badge");
    assert(rejectedRes.body.includes("Review Feedback"), "Displays Review Feedback header");
    assert(rejectedRes.body.includes(testRejectionReason), "Displays sanitized rejection reason accurately");

    // ====================================================
    // SUITE 7: Multi-Application Deterministic Selection
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 7: Multi-Application Selection Priority");
    console.log("==================================================");

    // Insert an older rejected application for userPending, followed by the active PENDING application
    const { data: olderRejApp } = await supabaseAdmin
      .from("tutor_applications")
      .insert({
        user_id: userPending.id,
        google_response_id: `gform_p4d_multi_rej_${timestamp}`,
        full_name: "Sunita Pending",
        email: userPendingEmail,
        status: "REJECTED",
        rejection_reason: "Older submission rejected",
        submitted_at: new Date(Date.now() - 100000).toISOString(),
      })
      .select()
      .single();
    createdAppIds.push(olderRejApp.id);

    // UserPending should STILL see PENDING (active state prioritized over older rejected)
    const multiAppRes = await fetchUrl("/tutor", {
      headers: { cookie: cookiePending },
    });
    assert(multiAppRes.body.includes("PENDING"), "Active PENDING application prioritized over older REJECTED submission");
    assert(!multiAppRes.body.includes("Application Not Approved"), "Older rejected state does not obscure active application");

    // ====================================================
    // SUITE 8: Data Privacy & Isolation
    // ====================================================
    console.log("\n==================================================");
    console.log("TEST SUITE 8: Data Privacy & Security Bounds");
    console.log("==================================================");

    // Verify User A cannot see User B's application
    assert(!noAppRes.body.includes("Sunita Pending"), "User with no application does not see other users' data");
    assert(!noAppRes.body.includes("Mallikashpur"), "Locations of other users are not exposed");

    // Verify private application fields are never rendered
    assert(!pendingRes.body.includes("secret_doc_pending"), "Documents are never leaked in /tutor response");
    assert(!pendingRes.body.includes("+91 9437111111"), "Phone numbers are not exposed in /tutor response");
    assert(!pendingRes.body.includes("gform_p4d_pending"), "google_response_id is never leaked in /tutor response");

    // Clean up test data
    console.log("\n[Cleanup] Cleaning up test applications and users...");
    await supabaseAdmin.from("tutor_applications").delete().in("id", createdAppIds);
    await supabaseAdmin.auth.admin.deleteUser(userNoApp.id);
    await supabaseAdmin.auth.admin.deleteUser(userPending.id);
    await supabaseAdmin.auth.admin.deleteUser(userUnderReview.id);
    await supabaseAdmin.auth.admin.deleteUser(userApproved.id);
    await supabaseAdmin.auth.admin.deleteUser(userRejected.id);
    console.log("  ✓ Cleanup complete.");

    // Summary
    console.log("\n==================================================");
    console.log(`TOTAL PHASE 4D TESTS: ${testsRun}`);
    console.log(`PASSED: ${testsPassed}`);
    console.log(`FAILED: ${testsFailed}`);
    console.log("==================================================");

    if (testsFailed === 0) {
      console.log("🎉 ALL PHASE 4D TUTOR PORTAL TESTS PASSED!\n");
      process.exit(0);
    } else {
      console.error(`💥 ${testsFailed} tests failed.`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Fatal test error:", err);
    process.exit(1);
  }
}

runValidation();
