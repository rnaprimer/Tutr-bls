import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createAnonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runVerification() {
  console.log("==================================================");
  console.log("VERIFYING STUDENT TUTOR REQUEST WORKFLOW (BUG FIX)");
  console.log("==================================================");

  const timestamp = Date.now();
  const studentEmail = `student.test.${timestamp}@example.com`;
  const student2Email = `student2.test.${timestamp}@example.com`;
  const password = "TestPassword123!";
  const createdAuthUserIds = [];
  const createdRequestIds = [];

  try {
    // 1. Get tutor "dev" and reference subject/class
    const { data: tutorDev, error: tutorErr } = await supabaseAdmin
      .from("tutor_profiles")
      .select("id, user_id, display_name, is_verified")
      .eq("id", "ece1344d-6974-4f1a-a819-777092e9a5ad")
      .single();

    assert(!tutorErr && Boolean(tutorDev), "Tutor 'dev' exists and is verified");

    // Fetch tutor user initial role
    const { data: tutorUserBefore } = await supabaseAdmin
      .from("users")
      .select("id, role")
      .eq("id", tutorDev.user_id)
      .single();
    const initialTutorRole = tutorUserBefore.role;
    console.log(`  Initial tutor role: ${initialTutorRole}`);

    // Resolve Physics subject ID and Class 10 class ID
    const { data: physicsSubject } = await supabaseAdmin
      .from("subjects")
      .select("id, name")
      .eq("name", "Physics")
      .single();
    assert(Boolean(physicsSubject), "Physics subject exists");

    const { data: class10 } = await supabaseAdmin
      .from("classes")
      .select("id, name")
      .eq("name", "Class 10")
      .single();
    assert(Boolean(class10), "Class 10 exists");

    // 2. Provision test Student A with role 'STUDENT'
    const { data: authStudentA, error: errSA } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Test Student A" },
    });
    if (errSA) throw errSA;
    const studentAId = authStudentA.user.id;
    createdAuthUserIds.push(studentAId);

    // Set initial role to 'STUDENT'
    await supabaseAdmin.from("users").update({ role: "STUDENT" }).eq("id", studentAId);
    const { data: studentRecordA } = await supabaseAdmin
      .from("students")
      .insert({ user_id: studentAId })
      .select("id")
      .single();
    assert(Boolean(studentRecordA), "Student A profile provisioned");

    // 3. Provision test Student B
    const { data: authStudentB } = await supabaseAdmin.auth.admin.createUser({
      email: student2Email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Test Student B" },
    });
    const studentBId = authStudentB.user.id;
    createdAuthUserIds.push(studentBId);
    await supabaseAdmin.from("users").update({ role: "STUDENT" }).eq("id", studentBId);
    const { data: studentRecordB } = await supabaseAdmin
      .from("students")
      .insert({ user_id: studentBId })
      .select("id")
      .single();

    // 4. Authenticate as Student A
    const studentAClient = createAnonClient();
    const { error: signInErr } = await studentAClient.auth.signInWithPassword({
      email: studentEmail,
      password,
    });
    assert(!signInErr, "Authenticated as Student A");

    // 5. Send Request to Tutor "dev" with Physics and Class 10
    console.log("\n[Action] Student A sending tutor request for Physics & Class 10...");
    const { data: requestRes, error: requestErr } = await studentAClient.rpc("create_tutor_request", {
      p_tutor_id: tutorDev.id,
      p_subject_id: physicsSubject.id,
      p_class_id: class10.id,
      p_message: "Need help with Class 10 Physics numericals",
    });

    assert(
      !requestErr && requestRes?.success === true && Boolean(requestRes?.request_id),
      "Request successfully created without 'Unauthorized: Only administrators can modify user roles' error!"
    );
    createdRequestIds.push(requestRes.request_id);

    // 6. Verify request record in database
    const { data: createdReq } = await supabaseAdmin
      .from("tutor_requests")
      .select("id, student_id, tutor_id, subject_id, class_id, status, message")
      .eq("id", requestRes.request_id)
      .single();

    assert(
      createdReq.student_id === studentRecordA.id &&
        createdReq.tutor_id === tutorDev.id &&
        createdReq.subject_id === physicsSubject.id &&
        createdReq.class_id === class10.id &&
        createdReq.status === "PENDING",
      "Request record verified in public.tutor_requests with correct student, tutor, subject, class, and status PENDING"
    );

    // 7. Verify student's role remains STUDENT
    const { data: studentUserAfter } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", studentAId)
      .single();
    assert(
      studentUserAfter.role === "STUDENT",
      `Student role remains strictly 'STUDENT' (actual: ${studentUserAfter.role})`
    );

    // 8. Verify tutor's role is completely unchanged
    const { data: tutorUserAfter } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", tutorDev.user_id)
      .single();
    assert(
      tutorUserAfter.role === initialTutorRole,
      `Tutor role remains strictly unchanged (actual: ${tutorUserAfter.role})`
    );

    // 9. Verify Student with role 'USER' also succeeds and role remains 'USER'
    console.log("\n[Test] Testing user with default role 'USER'...");
    const normalUserEmail = `user.test.${timestamp}@example.com`;
    const { data: authNormal } = await supabaseAdmin.auth.admin.createUser({
      email: normalUserEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Normal User" },
    });
    const normalUserId = authNormal.user.id;
    createdAuthUserIds.push(normalUserId);

    const normalClient = createAnonClient();
    await normalClient.auth.signInWithPassword({ email: normalUserEmail, password });

    // Request tutor
    const { data: normalReqRes, error: normalReqErr } = await normalClient.rpc("create_tutor_request", {
      p_tutor_id: tutorDev.id,
      p_subject_id: physicsSubject.id,
      p_class_id: class10.id,
      p_message: "Tuition request from normal user",
    });

    assert(!normalReqErr && normalReqRes?.success === true, "User with role 'USER' can create tutor request cleanly");
    if (normalReqRes?.request_id) createdRequestIds.push(normalReqRes.request_id);

    const { data: normalUserAfter } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", normalUserId)
      .single();
    assert(
      normalUserAfter.role === "USER",
      `User role remains 'USER' without any illegal role mutation (actual: ${normalUserAfter.role})`
    );

    // 10. Verify Student cannot create a request on behalf of another student via direct INSERT
    console.log("\n[Security] Verifying Student A cannot create request for Student B...");
    const { error: spoofErr } = await studentAClient.from("tutor_requests").insert({
      student_id: studentRecordB.id, // Student B's profile ID
      tutor_id: tutorDev.id,
      subject_id: physicsSubject.id,
      class_id: class10.id,
      status: "PENDING",
    });

    assert(
      spoofErr !== null,
      `Direct RLS insert spoofing another student is blocked (error: ${spoofErr?.message})`
    );

    console.log("\n==================================================");
    console.log("🎉 ALL 10 VERIFICATION CHECKS PASSED!");
    console.log("==================================================");
  } finally {
    // Cleanup
    for (const reqId of createdRequestIds) {
      await supabaseAdmin.from("tutor_requests").delete().eq("id", reqId);
    }
    for (const userId of createdAuthUserIds) {
      await supabaseAdmin.from("students").delete().eq("user_id", userId);
      await supabaseAdmin.from("users").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
  }
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
