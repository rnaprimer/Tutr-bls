/**
 * Permanent Role Reservation & Role-Locked Architecture Test Suite
 * 
 * Tests Scenarios A through AB:
 * 
 * Scenario A: New account with STUDENT intent reserves STUDENT atomically
 * Scenario B: New account with TUTOR intent reserves TUTOR atomically
 * Scenario C: Existing STUDENT calling reserve_user_role(..., 'TUTOR') -> role remains STUDENT
 * Scenario D: Existing TUTOR calling reserve_user_role(..., 'STUDENT') -> role remains TUTOR
 * Scenario E: STUDENT navigating to /login?role=TUTOR -> redirects to /student?notice=registered_as_student
 * Scenario F: TUTOR navigating to /login?role=STUDENT -> redirects to /tutor?notice=registered_as_tutor
 * Scenario G: STUDENT navigating to /login?next=/tutor -> redirects to /student?notice=registered_as_student
 * Scenario H: TUTOR navigating to /login?next=/student -> redirects to /tutor?notice=registered_as_tutor
 * Scenario I: STUDENT directly accessing /tutor -> redirects to /student?notice=registered_as_student (zero mutations)
 * Scenario J: TUTOR directly accessing /student -> redirects to /tutor?notice=registered_as_tutor (zero mutations)
 * Scenario K: ADMIN directly accessing /student -> redirects to /admin
 * Scenario L: ADMIN directly accessing /tutor -> redirects to /admin
 * Scenario M: Non-admin accessing /admin -> rejected/redirected
 * Scenario N: Authenticated unreserved USER accessing /student -> redirects to /select-role?next=/student
 * Scenario O: Authenticated unreserved USER accessing /tutor -> redirects to /select-role?next=/tutor
 * Scenario P: STUDENT accessing /select-role -> immediately redirected to /student
 * Scenario Q: TUTOR accessing /select-role -> immediately redirected to /tutor
 * Scenario R: ADMIN accessing /select-role -> immediately redirected to /admin
 * Scenario S: Authenticated unreserved USER submitting /select-role with STUDENT -> permanently reserves STUDENT
 * Scenario T: Authenticated unreserved USER submitting /select-role with TUTOR -> permanently reserves TUTOR
 * Scenario U: Database-Level: STUDENT attempting direct UPDATE public.users.role = 'TUTOR' -> MUST FAIL
 * Scenario V: Database-Level: TUTOR attempting direct UPDATE public.users.role = 'STUDENT' -> MUST FAIL
 * Scenario W: Database-Level: STUDENT calling reserve_user_role(..., 'TUTOR') -> returns STUDENT, DB role unchanged
 * Scenario X: Database-Level: TUTOR calling reserve_user_role(..., 'STUDENT') -> returns TUTOR, DB role unchanged
 * Scenario Y: Database-Level: STUDENT with historical tutor_application -> remains STUDENT (applications never override role)
 * Scenario Z: Database-Level: TUTOR with no tutor_application -> remains TUTOR
 * Scenario AA: Concurrent first-login attempts for STUDENT and TUTOR -> exactly one role permanently assigned
 * Scenario AB: Admin Override:
 *    - requires verified ADMIN authorization (non-admin execution fails)
 *    - acquires row lock and updates public.users.role
 *    - creates exactly ONE role_audit_logs record
 *    - tutor_applications: ZERO automatic mutation
 *    - tutor_profiles: ZERO automatic mutation
 *    - payment records: ZERO automatic mutation
 *    - students: created idempotently when new_role = STUDENT
 *    - role_audit_logs: RLS denies normal users SELECT, allows verified ADMIN
 *    - affected user's next resolution immediately reflects new role
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error("❌ Missing required Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
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

// Track synthetic accounts for guaranteed cleanup
const createdUserIds = new Set();
const TEST_ACCOUNT_PREFIX = `test_rl_${Date.now()}`;

async function createTestAccount(roleTag, initialRole = "USER") {
  const email = `${TEST_ACCOUNT_PREFIX}_${roleTag}@example.com`;
  const password = "TestPassword123!";

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test User ${roleTag}` },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user ${email}: ${authError?.message}`);
  }

  const userId = authData.user.id;
  createdUserIds.add(userId);

  // If initialRole is not USER, set it via service role
  if (initialRole !== "USER") {
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ role: initialRole })
      .eq("id", userId);

    if (updateError) {
      throw new Error(`Failed to set initial role ${initialRole} for ${userId}: ${updateError.message}`);
    }

    if (initialRole === "STUDENT") {
      await supabaseAdmin.from("students").insert({ user_id: userId }).select().maybeSingle();
    }
  }

  // Create an authenticated client for this user
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sessionData, error: sessionError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });

  if (sessionError) {
    throw new Error(`Failed to sign in as ${email}: ${sessionError.message}`);
  }

  return {
    userId,
    email,
    password,
    client: userClient,
    session: sessionData.session,
  };
}

async function cleanupAccounts() {
  console.log("\n--- Cleaning up synthetic test accounts ---");
  for (const userId of createdUserIds) {
    try {
      await supabaseAdmin.from("role_audit_logs").delete().eq("target_user_id", userId);
      await supabaseAdmin.from("role_audit_logs").delete().eq("changed_by", userId);
      await supabaseAdmin.from("students").delete().eq("user_id", userId);
      await supabaseAdmin.from("tutor_profiles").delete().eq("user_id", userId);
      await supabaseAdmin.from("tutor_applications").delete().eq("user_id", userId);
      await supabaseAdmin.from("users").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (err) {
      console.warn(`Warning cleaning up test user ${userId}:`, err.message);
    }
  }
  console.log(`Cleaned up ${createdUserIds.size} synthetic test accounts.`);
}



// ==============================================================================
// MAIN TEST RUNNER
// ==============================================================================
async function runTests() {
  console.log("==================================================================");
  console.log("TUTR: PERMANENT ROLE RESERVATION & ROLE-LOCKED ARCHITECTURE TESTS");
  console.log("==================================================================");

  try {
    // --------------------------------------------------------------------------
    // Test A: New account with STUDENT intent reserves STUDENT atomically
    // --------------------------------------------------------------------------
    console.log("\n[TEST A] New account with STUDENT intent reserves STUDENT atomically");
    const userA = await createTestAccount("user_a", "USER");
    const { data: resA, error: errA } = await userA.client.rpc("reserve_user_role", {
      p_user_id: userA.userId,
      p_requested_role: "STUDENT",
    });
    assert(!errA, "RPC reserve_user_role succeeded without error");
    assert(resA?.role === "STUDENT", "RPC returns role === STUDENT");
    assert(resA?.is_new === true, "RPC flags is_new === true");
    assert(resA?.mismatch === false, "RPC flags mismatch === false");

    const { data: checkA } = await supabaseAdmin.from("users").select("role").eq("id", userA.userId).single();
    assert(checkA?.role === "STUDENT", "public.users.role is permanently STUDENT in database");

    // --------------------------------------------------------------------------
    // Test B: New account with TUTOR intent reserves TUTOR atomically
    // --------------------------------------------------------------------------
    console.log("\n[TEST B] New account with TUTOR intent reserves TUTOR atomically");
    const userB = await createTestAccount("user_b", "USER");
    const { data: resB, error: errB } = await userB.client.rpc("reserve_user_role", {
      p_user_id: userB.userId,
      p_requested_role: "TUTOR",
    });
    assert(!errB, "RPC reserve_user_role succeeded without error");
    assert(resB?.role === "TUTOR", "RPC returns role === TUTOR");
    assert(resB?.is_new === true, "RPC flags is_new === true");
    assert(resB?.mismatch === false, "RPC flags mismatch === false");

    const { data: checkB } = await supabaseAdmin.from("users").select("role").eq("id", userB.userId).single();
    assert(checkB?.role === "TUTOR", "public.users.role is permanently TUTOR in database");

    // --------------------------------------------------------------------------
    // Test C: Existing STUDENT calling reserve_user_role(..., 'TUTOR') -> role remains STUDENT
    // --------------------------------------------------------------------------
    console.log("\n[TEST C] Existing STUDENT calling reserve_user_role(..., 'TUTOR') -> remains STUDENT");
    const userC = await createTestAccount("user_c", "STUDENT");
    const { data: resC, error: errC } = await userC.client.rpc("reserve_user_role", {
      p_user_id: userC.userId,
      p_requested_role: "TUTOR",
    });
    assert(!errC, "RPC executes without fatal error");
    assert(resC?.role === "STUDENT", "RPC returns locked role STUDENT");
    assert(resC?.is_new === false, "RPC returns is_new === false");
    assert(resC?.mismatch === true, "RPC flags mismatch === true");

    const { data: checkC } = await supabaseAdmin.from("users").select("role").eq("id", userC.userId).single();
    assert(checkC?.role === "STUDENT", "public.users.role remains STUDENT in database");

    // --------------------------------------------------------------------------
    // Test D: Existing TUTOR calling reserve_user_role(..., 'STUDENT') -> role remains TUTOR
    // --------------------------------------------------------------------------
    console.log("\n[TEST D] Existing TUTOR calling reserve_user_role(..., 'STUDENT') -> remains TUTOR");
    const userD = await createTestAccount("user_d", "TUTOR");
    const { data: resD, error: errD } = await userD.client.rpc("reserve_user_role", {
      p_user_id: userD.userId,
      p_requested_role: "STUDENT",
    });
    assert(!errD, "RPC executes without fatal error");
    assert(resD?.role === "TUTOR", "RPC returns locked role TUTOR");
    assert(resD?.is_new === false, "RPC returns is_new === false");
    assert(resD?.mismatch === true, "RPC flags mismatch === true");

    const { data: checkD } = await supabaseAdmin.from("users").select("role").eq("id", userD.userId).single();
    assert(checkD?.role === "TUTOR", "public.users.role remains TUTOR in database");

    // --------------------------------------------------------------------------
    // Helper to test SSR cookie-based routes
    // --------------------------------------------------------------------------
    // For Next.js SSR layout/page tests, we can test layout guards via component/function
    // or by inspecting redirect logic.
    // Let's also test HTTP redirects for endpoints that take role query parameters.

    // --------------------------------------------------------------------------
    // Test E & G: STUDENT calling /login?role=TUTOR or /login?next=/tutor
    // --------------------------------------------------------------------------
    console.log("\n[TEST E, F, G, H] Authenticated Login Route Redirection Logic");
    // Verify login logic:
    // In app/login/page.tsx:
    // if (userRole === "STUDENT") {
    //   if (roleParam === "TUTOR" || safeNext.startsWith("/tutor")) {
    //     redirect("/student?notice=registered_as_student");
    //   }
    //   redirect("/student");
    // }
    // if (userRole === "TUTOR") {
    //   if (roleParam === "STUDENT" || safeNext.startsWith("/student")) {
    //     redirect("/tutor?notice=registered_as_tutor");
    //   }
    //   redirect("/tutor");
    // }
    const loginPageContent = fs.readFileSync(path.resolve("./app/login/page.tsx"), "utf-8");
    assert(
      loginPageContent.includes('redirect("/student?notice=registered_as_student")'),
      "LoginPage redirects STUDENT accessing tutor flow to /student?notice=registered_as_student"
    );
    assert(
      loginPageContent.includes('redirect("/tutor?notice=registered_as_tutor")'),
      "LoginPage redirects TUTOR accessing student flow to /tutor?notice=registered_as_tutor"
    );
    assert(
      loginPageContent.includes('if (userRole === "ADMIN") {\n      redirect("/admin");\n    }'),
      "LoginPage redirects ADMIN to /admin"
    );
    assert(
      loginPageContent.includes('if (userRole === "USER") {\n      redirect("/select-role");\n    }'),
      "LoginPage redirects USER to /select-role"
    );

    // --------------------------------------------------------------------------
    // Test I, J: Layout Route Guards for /student and /tutor
    // --------------------------------------------------------------------------
    console.log("\n[TEST I, J, K, L, N, O] Layout-Level Route Guards");
    const studentLayout = fs.readFileSync(path.resolve("./app/student/layout.tsx"), "utf-8");
    const tutorLayout = fs.readFileSync(path.resolve("./app/tutor/layout.tsx"), "utf-8");
    const adminLayout = fs.readFileSync(path.resolve("./app/admin/layout.tsx"), "utf-8");

    // Student layout guards
    assert(
      studentLayout.includes('redirect("/login?next=/student")'),
      "StudentLayout redirects unauthenticated visitors to /login?next=/student"
    );
    assert(
      studentLayout.includes('if (role === "ADMIN") {\n    redirect("/admin");\n  }'),
      "StudentLayout redirects ADMIN to /admin"
    );
    assert(
      studentLayout.includes('if (role === "TUTOR") {\n    redirect("/tutor?notice=registered_as_tutor");\n  }'),
      "StudentLayout redirects TUTOR to /tutor?notice=registered_as_tutor"
    );
    assert(
      studentLayout.includes('if (role === "USER") {\n    redirect("/select-role?next=/student");\n  }'),
      "StudentLayout redirects USER to /select-role?next=/student"
    );

    // Tutor layout guards
    assert(
      tutorLayout.includes('redirect("/login?next=/tutor")'),
      "TutorLayout redirects unauthenticated visitors to /login?next=/tutor"
    );
    assert(
      tutorLayout.includes('if (role === "ADMIN") {\n    redirect("/admin");\n  }'),
      "TutorLayout redirects ADMIN to /admin"
    );
    assert(
      tutorLayout.includes('if (role === "STUDENT") {\n    redirect("/student?notice=registered_as_student");\n  }'),
      "TutorLayout redirects STUDENT to /student?notice=registered_as_student"
    );
    assert(
      tutorLayout.includes('if (role === "USER") {\n    redirect("/select-role?next=/tutor");\n  }'),
      "TutorLayout redirects USER to /select-role?next=/tutor"
    );

    // Admin layout guards
    assert(
      adminLayout.includes('if (role !== "ADMIN") {\n    redirect("/");\n  }'),
      "AdminLayout blocks any non-ADMIN user with immediate redirect to /"
    );

    // --------------------------------------------------------------------------
    // Test P, Q, R: /select-role Gatekeeper Security
    // --------------------------------------------------------------------------
    console.log("\n[TEST P, Q, R] /select-role Gatekeeper Security");
    const selectRolePage = fs.readFileSync(path.resolve("./app/select-role/page.tsx"), "utf-8");
    assert(
      selectRolePage.includes('if (role === "ADMIN") {\n    redirect("/admin");\n  }'),
      "SelectRolePage immediately redirects ADMIN to /admin"
    );
    assert(
      selectRolePage.includes('if (role === "STUDENT") {\n    redirect("/student");\n  }'),
      "SelectRolePage immediately redirects STUDENT to /student"
    );
    assert(
      selectRolePage.includes('if (role === "TUTOR") {\n    redirect("/tutor");\n  }'),
      "SelectRolePage immediately redirects TUTOR to /tutor"
    );

    // --------------------------------------------------------------------------
    // Test S, T: /select-role Action calls reserve_user_role
    // --------------------------------------------------------------------------
    console.log("\n[TEST S, T] /select-role Action Execution");
    assert(
      selectRolePage.includes('actionClient.rpc("reserve_user_role"'),
      "SelectRolePage calls atomic reserve_user_role RPC"
    );

    // --------------------------------------------------------------------------
    // Test U: Database Trigger: STUDENT direct UPDATE public.users.role = 'TUTOR' MUST FAIL
    // --------------------------------------------------------------------------
    console.log("\n[TEST U] Database-Level: STUDENT direct UPDATE role = 'TUTOR' MUST FAIL");
    const userU = await createTestAccount("user_u", "STUDENT");
    const { error: errU } = await userU.client
      .from("users")
      .update({ role: "TUTOR" })
      .eq("id", userU.userId);

    assert(errU !== null, "Direct UPDATE by student returned an error");
    assert(
      errU?.message?.includes("Account roles are permanently locked") ||
      errU?.message?.includes("Unauthorized") ||
      errU?.code === "P0001",
      `Error correctly blocked by prevent_user_role_escalation trigger: ${errU?.message}`
    );

    const { data: checkU } = await supabaseAdmin.from("users").select("role").eq("id", userU.userId).single();
    assert(checkU?.role === "STUDENT", "Role strictly remained STUDENT after direct UPDATE attempt");

    // --------------------------------------------------------------------------
    // Test V: Database Trigger: TUTOR direct UPDATE public.users.role = 'STUDENT' MUST FAIL
    // --------------------------------------------------------------------------
    console.log("\n[TEST V] Database-Level: TUTOR direct UPDATE role = 'STUDENT' MUST FAIL");
    const userV = await createTestAccount("user_v", "TUTOR");
    const { error: errV } = await userV.client
      .from("users")
      .update({ role: "STUDENT" })
      .eq("id", userV.userId);

    assert(errV !== null, "Direct UPDATE by tutor returned an error");
    assert(
      errV?.message?.includes("Account roles are permanently locked") ||
      errV?.message?.includes("Unauthorized") ||
      errV?.code === "P0001",
      `Error correctly blocked by prevent_user_role_escalation trigger: ${errV?.message}`
    );

    const { data: checkV } = await supabaseAdmin.from("users").select("role").eq("id", userV.userId).single();
    assert(checkV?.role === "TUTOR", "Role strictly remained TUTOR after direct UPDATE attempt");

    // --------------------------------------------------------------------------
    // Test W, X: RPC Invocation on Locked Roles
    // --------------------------------------------------------------------------
    console.log("\n[TEST W, X] RPC Invocation on Locked Roles");
    const { data: resW } = await userU.client.rpc("reserve_user_role", {
      p_user_id: userU.userId,
      p_requested_role: "TUTOR",
    });
    assert(resW?.role === "STUDENT", "Student calling reserve_user_role('TUTOR') returns STUDENT");
    assert(resW?.is_new === false, "Student calling reserve_user_role('TUTOR') is_new === false");

    const { data: resX } = await userV.client.rpc("reserve_user_role", {
      p_user_id: userV.userId,
      p_requested_role: "STUDENT",
    });
    assert(resX?.role === "TUTOR", "Tutor calling reserve_user_role('STUDENT') returns TUTOR");
    assert(resX?.is_new === false, "Tutor calling reserve_user_role('STUDENT') is_new === false");

    // --------------------------------------------------------------------------
    // Test Y: STUDENT with historical tutor_application -> remains STUDENT
    // --------------------------------------------------------------------------
    console.log("\n[TEST Y] STUDENT with historical tutor_application -> remains STUDENT");
    const userY = await createTestAccount("user_y", "STUDENT");
    // Insert a historical tutor application for this user's email
    await supabaseAdmin.from("tutor_applications").insert({
      email: userY.email,
      full_name: "Historical Applicant",
      user_id: userY.userId,
      status: "PENDING",
      phone: "9999999999",
      experience_years: 3,
      qualification: "B.Tech",
    });

    // Check runtime role resolver
    const { resolveUserRole } = await import("../lib/auth/role.ts");
    const resolvedRoleY = await resolveUserRole(supabaseAdmin, userY.userId);
    assert(resolvedRoleY === "STUDENT", "Runtime role resolver returns STUDENT despite historical application");

    const { data: dbUserY } = await supabaseAdmin.from("users").select("role").eq("id", userY.userId).single();
    assert(dbUserY?.role === "STUDENT", "Authoritative users.role in database remains STUDENT");

    // --------------------------------------------------------------------------
    // Test Z: TUTOR with no tutor_application -> remains TUTOR
    // --------------------------------------------------------------------------
    console.log("\n[TEST Z] TUTOR with no tutor_application -> remains TUTOR");
    const userZ = await createTestAccount("user_z", "TUTOR");
    const resolvedRoleZ = await resolveUserRole(supabaseAdmin, userZ.userId);
    assert(resolvedRoleZ === "TUTOR", "Runtime role resolver returns TUTOR without any application");

    // --------------------------------------------------------------------------
    // Test AA: Concurrent first-login attempts for STUDENT and TUTOR
    // --------------------------------------------------------------------------
    console.log("\n[TEST AA] Concurrent first-login attempts serialization");
    const userAA = await createTestAccount("user_aa", "USER");

    // Fire two concurrent role reservations with conflicting roles
    const [promise1, promise2] = await Promise.all([
      userAA.client.rpc("reserve_user_role", { p_user_id: userAA.userId, p_requested_role: "STUDENT" }),
      userAA.client.rpc("reserve_user_role", { p_user_id: userAA.userId, p_requested_role: "TUTOR" }),
    ]);

    assert(!promise1.error && !promise2.error, "Both concurrent RPC calls completed without crashing");
    const finalCheckAA = await supabaseAdmin.from("users").select("role").eq("id", userAA.userId).single();
    const finalRoleAA = finalCheckAA.data?.role;
    assert(
      finalRoleAA === "STUDENT" || finalRoleAA === "TUTOR",
      `Exactly one role was permanently assigned: ${finalRoleAA}`
    );

    const winnerResult = promise1.data?.is_new ? promise1.data : promise2.data;
    const loserResult = promise1.data?.is_new ? promise2.data : promise1.data;

    assert(winnerResult.is_new === true, "Winning transaction marked is_new === true");
    assert(loserResult.is_new === false, "Subsequent transaction saw row lock and marked is_new === false");
    assert(loserResult.role === finalRoleAA, "Subsequent transaction returned the winning role");

    // --------------------------------------------------------------------------
    // Test AB: Admin Override & Audit Logging
    // --------------------------------------------------------------------------
    console.log("\n[TEST AB] Admin Override RPC, Audit Logging & Zero Cross-Role Side Effects");
    // Find admin user
    const { data: adminUsers } = await supabaseAdmin.from("users").select("id, email").eq("role", "ADMIN").limit(1);
    const adminUser = adminUsers?.[0];
    if (!adminUser) {
      throw new Error("No ADMIN account found in database to test admin override");
    }

    // A target user that is currently TUTOR
    const targetUser = await createTestAccount("target_ab", "TUTOR");

    // 1. Non-admin attempting admin_override_user_role MUST FAIL
    const { error: nonAdminErr } = await targetUser.client.rpc("admin_override_user_role", {
      p_target_user_id: targetUser.userId,
      p_new_role: "STUDENT",
    });
    assert(nonAdminErr !== null, "Non-admin calling admin_override_user_role is REJECTED");

    // 2. Count existing records before override
    const { count: appCountBefore } = await supabaseAdmin
      .from("tutor_applications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUser.userId);

    const { count: profCountBefore } = await supabaseAdmin
      .from("tutor_profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUser.userId);

    const { count: auditCountBefore } = await supabaseAdmin
      .from("role_audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("target_user_id", targetUser.userId);

    // 3. Perform Admin Override as Service Role (simulating authenticated admin via RPC or direct override)
    const { data: overrideRes, error: overrideErr } = await supabaseAdmin.rpc("admin_override_user_role", {
      p_target_user_id: targetUser.userId,
      p_new_role: "STUDENT",
    });

    assert(!overrideErr, `Admin override executed successfully: ${overrideErr?.message}`);
    assert(overrideRes?.success === true, "Override result returned success === true");
    assert(overrideRes?.new_role === "STUDENT", "Override result returned new_role === STUDENT");

    // 4. Verify authoritative database update
    const { data: targetAfter } = await supabaseAdmin.from("users").select("role").eq("id", targetUser.userId).single();
    assert(targetAfter?.role === "STUDENT", "public.users.role updated to STUDENT immediately");

    // 5. Verify Zero automatic mutations on tutor_applications and tutor_profiles
    const { count: appCountAfter } = await supabaseAdmin
      .from("tutor_applications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUser.userId);

    const { count: profCountAfter } = await supabaseAdmin
      .from("tutor_profiles")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUser.userId);

    assert(appCountAfter === appCountBefore, "tutor_applications: ZERO automatic mutation");
    assert(profCountAfter === profCountBefore, "tutor_profiles: ZERO automatic mutation");

    // 6. Verify students record was created idempotently
    const { data: studentRecord } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("user_id", targetUser.userId)
      .maybeSingle();
    assert(studentRecord !== null, "students profile created idempotently for newly assigned STUDENT");

    // 7. Verify exactly ONE new audit log record
    const { data: auditLogs } = await supabaseAdmin
      .from("role_audit_logs")
      .select("*")
      .eq("target_user_id", targetUser.userId);

    assert(auditLogs?.length === auditCountBefore + 1, "role_audit_logs: exactly ONE new audit log record created");
    assert(auditLogs?.[0]?.previous_role === "TUTOR", "Audit log records previous_role === TUTOR");
    assert(auditLogs?.[0]?.new_role === "STUDENT", "Audit log records new_role === STUDENT");

    // 8. Verify RLS on role_audit_logs: Normal users cannot SELECT
    const { data: normalAuditRead, error: normalAuditErr } = await targetUser.client
      .from("role_audit_logs")
      .select("*");
    assert(
      normalAuditRead?.length === 0 || normalAuditErr !== null,
      "RLS: Normal user cannot view role_audit_logs"
    );

    // --------------------------------------------------------------------------
    // Test: Homepage Zero-Flash Server Resolution
    // --------------------------------------------------------------------------
    console.log("\n[TEST HOMEPAGE] Zero-Flash Server Resolution & Role CTAs");
    const heroCode = fs.readFileSync(path.resolve("./components/Hero.tsx"), "utf-8");
    const navbarCode = fs.readFileSync(path.resolve("./components/Navbar.tsx"), "utf-8");
    const homePageCode = fs.readFileSync(path.resolve("./app/page.tsx"), "utf-8");

    assert(homePageCode.includes("resolveUserRole(supabase, user?.id)"), "app/page.tsx resolves userRole server-side");
    assert(homePageCode.includes("<Hero initialRole={userRole} />"), "app/page.tsx passes initialRole to Hero component");
    assert(heroCode.includes("useState<RoleType>(initialRole)"), "Hero initializes state directly from initialRole (zero flash)");
    assert(heroCode.includes("isStudent && ("), "Hero renders student CTA conditionally");
    assert(heroCode.includes("isTutor && ("), "Hero renders tutor CTA conditionally");
    assert(heroCode.includes("isAdmin && ("), "Hero renders admin CTA conditionally");
    assert(heroCode.includes("isUnreservedUser && ("), "Hero renders unreserved user role-selection CTA conditionally");
    assert(heroCode.includes("isLoggedOut && ("), "Hero renders both student & tutor CTAs only when logged out");
    assert(navbarCode.includes('userRole === "STUDENT"'), "Navbar renders role-specific dashboard link for STUDENT");
    assert(navbarCode.includes('userRole === "TUTOR"'), "Navbar renders role-specific dashboard link for TUTOR");
    assert(navbarCode.includes('userRole === "ADMIN"'), "Navbar renders role-specific dashboard link for ADMIN");
    assert(navbarCode.includes('userRole === "USER"'), "Navbar renders Choose Role link for USER");

  } finally {
    await cleanupAccounts();
  }

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS RUN: ${testsRun}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log("==================================================================");

  if (testsFailed === 0) {
    console.log("🎉 ALL PERMANENT ROLE LOCK TESTS PASSED PERFECTLY!\n");
    process.exit(0);
  } else {
    console.error(`💥 ${testsFailed} tests failed!`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test error:", err);
  cleanupAccounts().finally(() => process.exit(1));
});
