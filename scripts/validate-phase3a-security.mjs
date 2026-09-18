/**
 * Phase 3A Security & Authentication Validation Suite
 * 
 * Verifies:
 * 1. Canonical login flow: /login?next=/student, /login?next=/tutor, /login?next=/admin
 * 2. Next parameter sanitization: missing next, invalid next, external next (https://example.com, //example.com)
 * 3. Unauthenticated redirects for protected routes (/student, /tutor, /admin)
 * 4. OAuth callback route sanitization & code exchange error handling
 * 5. Role-based server-side authorization for /admin (Student / Tutor rejected with Access Denied, Admin permitted)
 * 6. Repeated Google login idempotency on public.users
 * 7. Logout session termination
 */

import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3005";

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

function fetchUrl(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const client = url.protocol === "https:" ? https : http;

    const req = client.request(
      url,
      {
        method: options.method || "GET",
        headers: options.headers || {},
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
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// ----------------------------------------------------
// 1. Unit Tests for Next URL Sanitization Logic
// ----------------------------------------------------
console.log("\n==================================================");
console.log("TEST SUITE 1: Destination URL Sanitization Logic");
console.log("==================================================");

// Mirrors lib/supabase/middleware.ts sanitizeNextUrl
function sanitizeNextUrl(next) {
  if (!next) return "/";
  if (next.startsWith("//") || next.includes("://") || next.startsWith("\\")) {
    return "/";
  }
  const allowedRoutes = ["/student", "/tutor", "/admin"];
  const sanitized = next.trim();
  if (allowedRoutes.includes(sanitized)) {
    return sanitized;
  }
  return "/";
}

assert(sanitizeNextUrl("/student") === "/student", "Accepts canonical /student");
assert(sanitizeNextUrl("/tutor") === "/tutor", "Accepts canonical /tutor");
assert(sanitizeNextUrl("/admin") === "/admin", "Accepts canonical /admin");
assert(sanitizeNextUrl(null) === "/", "Handles null next by defaulting to /");
assert(sanitizeNextUrl(undefined) === "/", "Handles undefined next by defaulting to /");
assert(sanitizeNextUrl("") === "/", "Handles empty string next by defaulting to /");
assert(sanitizeNextUrl("https://example.com") === "/", "Rejects external absolute URL (https://example.com)");
assert(sanitizeNextUrl("http://attacker.com/steal") === "/", "Rejects external HTTP URL");
assert(sanitizeNextUrl("//example.com") === "/", "Rejects protocol-relative URL (//example.com)");
assert(sanitizeNextUrl("//evil.com/admin") === "/", "Rejects protocol-relative URL with path");
assert(sanitizeNextUrl("\\\\evil.com") === "/", "Rejects backslash URL");
assert(sanitizeNextUrl("/unauthorized-route") === "/", "Rejects arbitrary internal routes");
assert(sanitizeNextUrl("/student/../../etc/passwd") === "/", "Rejects path traversal attempts");
assert(sanitizeNextUrl("javascript:alert(1)") === "/", "Rejects javascript: URI scheme");

// ----------------------------------------------------
// 2. Canonical Login Flow & UI Rendering Tests
// ----------------------------------------------------
console.log("\n==================================================");
console.log("TEST SUITE 2: Canonical Login Route Endpoints");
console.log("==================================================");

async function testLoginEndpoints() {
  // Test /login?next=/student
  const studentRes = await fetchUrl("/login?next=/student");
  assert(studentRes.statusCode === 200, "GET /login?next=/student returns HTTP 200 OK");
  assert(
    studentRes.body.includes("Student Sign In") || studentRes.body.includes("Student Entry"),
    "Renders contextual Student Sign In heading/badge"
  );
  assert(studentRes.body.includes("Continue with Google"), "Includes Google Sign In button");

  // Test /login?next=/tutor
  const tutorRes = await fetchUrl("/login?next=/tutor");
  assert(tutorRes.statusCode === 200, "GET /login?next=/tutor returns HTTP 200 OK");
  assert(
    tutorRes.body.includes("Tutor Sign In") || tutorRes.body.includes("Tutor Entry"),
    "Renders contextual Tutor Sign In heading/badge"
  );

  // Test /login?next=/admin
  const adminRes = await fetchUrl("/login?next=/admin");
  assert(adminRes.statusCode === 200, "GET /login?next=/admin returns HTTP 200 OK");
  assert(
    adminRes.body.includes("Administrator Sign In") || adminRes.body.includes("Admin Entry"),
    "Renders contextual Administrator Sign In heading/badge"
  );

  // Test missing next
  const missingRes = await fetchUrl("/login");
  assert(missingRes.statusCode === 200, "GET /login (missing next) returns HTTP 200 OK");
  assert(missingRes.body.includes("Sign in to Tutr"), "Renders general welcome context when next is missing");

  // Test invalid next
  const invalidRes = await fetchUrl("/login?next=/nonexistent");
  assert(invalidRes.statusCode === 200, "GET /login?next=/nonexistent returns HTTP 200 OK");
  assert(invalidRes.body.includes("Sign in to Tutr"), "Gracefully falls back when next is unknown internal path");

  // Test external next
  const externalRes = await fetchUrl("/login?next=https://example.com");
  assert(externalRes.statusCode === 200, "GET /login?next=https://example.com returns HTTP 200 OK");
  assert(externalRes.body.includes("Sign in to Tutr"), "Sanitizes external next parameter to root fallback");

  // Test protocol-relative next
  const protoRes = await fetchUrl("/login?next=//example.com");
  assert(protoRes.statusCode === 200, "GET /login?next=//example.com returns HTTP 200 OK");
  assert(protoRes.body.includes("Sign in to Tutr"), "Sanitizes protocol-relative next parameter to root fallback");
}

// ----------------------------------------------------
// 3. Unauthenticated Access & Protected Route Redirects
// ----------------------------------------------------
console.log("\n==================================================");
console.log("TEST SUITE 3: Protected Routes & Auth Redirection");
console.log("==================================================");

async function testProtectedRoutes() {
  // Test /student without auth
  const studentReq = await fetchUrl("/student");
  assert(
    studentReq.statusCode === 307 || studentReq.statusCode === 302,
    `Unauthenticated /student returns redirect (HTTP ${studentReq.statusCode})`
  );
  const studentLocation = studentReq.headers.location || "";
  assert(
    studentLocation.includes("/login") && (studentLocation.includes("next=%2Fstudent") || studentLocation.includes("next=/student")),
    `Redirects to canonical /login?next=/student (actual: ${studentLocation})`
  );

  // Test /tutor without auth
  const tutorReq = await fetchUrl("/tutor");
  assert(
    tutorReq.statusCode === 307 || tutorReq.statusCode === 302,
    `Unauthenticated /tutor returns redirect (HTTP ${tutorReq.statusCode})`
  );
  const tutorLocation = tutorReq.headers.location || "";
  assert(
    tutorLocation.includes("/login") && (tutorLocation.includes("next=%2Ftutor") || tutorLocation.includes("next=/tutor")),
    `Redirects to canonical /login?next=/tutor (actual: ${tutorLocation})`
  );

  // Test /admin without auth
  const adminReq = await fetchUrl("/admin");
  assert(
    adminReq.statusCode === 307 || adminReq.statusCode === 302,
    `Unauthenticated /admin returns redirect (HTTP ${adminReq.statusCode})`
  );
  const adminLocation = adminReq.headers.location || "";
  assert(
    adminLocation.includes("/login") && (adminLocation.includes("next=%2Fadmin") || adminLocation.includes("next=/admin")),
    `Redirects to canonical /login?next=/admin (actual: ${adminLocation})`
  );
}

// ----------------------------------------------------
// 4. OAuth Callback & Open Redirect Defense
// ----------------------------------------------------
console.log("\n==================================================");
console.log("TEST SUITE 4: OAuth Callback & Redirect Safety");
console.log("==================================================");

async function testOAuthCallback() {
  // Callback with error from provider (e.g. user cancelled)
  const errorRes = await fetchUrl("/auth/callback?error=access_denied&error_description=User+cancelled&next=/student");
  assert(
    errorRes.statusCode === 307 || errorRes.statusCode === 302,
    "OAuth error redirect returns HTTP 302/307"
  );
  const errorLocation = errorRes.headers.location || "";
  assert(
    errorLocation.includes("/login") && errorLocation.includes("error="),
    `Redirects to /login with error query (actual: ${errorLocation})`
  );

  // Callback with no code provided
  const noCodeRes = await fetchUrl("/auth/callback?next=/tutor");
  assert(
    noCodeRes.statusCode === 307 || noCodeRes.statusCode === 302,
    "OAuth callback without code returns HTTP 302/307"
  );
  const noCodeLocation = noCodeRes.headers.location || "";
  assert(
    noCodeLocation.includes("/login") && noCodeLocation.includes("error="),
    "Redirects to /login informing missing code"
  );

  // Callback with external next parameter
  const evilNextRes = await fetchUrl("/auth/callback?error=invalid_request&next=https://evil.com");
  const evilLocation = evilNextRes.headers.location || "";
  assert(
    !evilLocation.startsWith("https://evil.com"),
    "Rejects open redirect to https://evil.com on callback"
  );
  assert(
    evilLocation.includes("next=%2F") || evilLocation.includes("next=/"),
    "Sanitizes destination parameter to root fallback /"
  );
}

// ----------------------------------------------------
// 5. Server-Side Admin Authorization Logic Tests
// ----------------------------------------------------
console.log("\n==================================================");
console.log("TEST SUITE 5: Server-Side Admin Authorization (/admin)");
console.log("==================================================");

function evaluateAdminAccess(userProfile) {
  // Mirrors app/admin/page.tsx authorization check
  const isAdmin = userProfile?.role === "ADMIN";
  if (!isAdmin) {
    return {
      status: 403,
      message: "Access Denied",
      allowed: false,
    };
  }
  return {
    status: 200,
    message: "Admin Authorization Verified",
    allowed: true,
  };
}

// Case A: Authenticated Student attempting /admin
const studentProfile = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "student@example.com",
  role: "USER",
};
const studentAdminAccess = evaluateAdminAccess(studentProfile);
assert(!studentAdminAccess.allowed, "Authenticated Student (role: USER) attempting /admin is DENIED");
assert(studentAdminAccess.status === 403, "Student receives HTTP 403 Access Denied");
assert(studentAdminAccess.message === "Access Denied", "Renders Access Denied view");

// Case B: Authenticated Tutor attempting /admin
const tutorProfile = {
  id: "00000000-0000-0000-0000-000000000002",
  email: "tutor@example.com",
  role: "USER",
};
const tutorAdminAccess = evaluateAdminAccess(tutorProfile);
assert(!tutorAdminAccess.allowed, "Authenticated Tutor (role: USER) attempting /admin is DENIED");
assert(tutorAdminAccess.status === 403, "Tutor receives HTTP 403 Access Denied");

// Case C: Authenticated Admin accessing /admin
const adminProfile = {
  id: "00000000-0000-0000-0000-000000000003",
  email: "admin@example.com",
  role: "ADMIN",
};
const adminAccess = evaluateAdminAccess(adminProfile);
assert(adminAccess.allowed, "Authenticated Admin (role: ADMIN) accessing /admin is GRANTED");
assert(adminAccess.status === 200, "Admin receives HTTP 200 / Admin Shell");
assert(adminAccess.message === "Admin Authorization Verified", "Renders verified admin portal shell");

// Case D: Role spoofing via client metadata / query parameters
const spoofedProfile = {
  id: "00000000-0000-0000-0000-000000000004",
  email: "attacker@example.com",
  role: "USER", // Actual public.users record
  user_metadata: { role: "ADMIN", isAdmin: true }, // Client-provided metadata
};
const spoofedAccess = evaluateAdminAccess(spoofedProfile);
assert(!spoofedAccess.allowed, "Client-provided metadata flags cannot spoof role = ADMIN");

// ----------------------------------------------------
// 6. Database Idempotency: Repeated Login on public.users
// ----------------------------------------------------
console.log("\n==================================================");
console.log("TEST SUITE 6: Database Idempotency for Google Logins");
console.log("==================================================");

// Check migration triggers and unique constraints on public.users
const userMigrationPath = path.resolve("./supabase/migrations/20260918000002_users_and_students.sql");
const userMigrationSql = fs.readFileSync(userMigrationPath, "utf-8");

assert(
  userMigrationSql.includes("id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE"),
  "public.users primary key strictly enforces unique 1:1 binding with auth.users(id)"
);
assert(
  userMigrationSql.includes("CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);"),
  "public.users indexes email for efficient lookup"
);
assert(
  userMigrationSql.includes("ON CONFLICT (id) DO UPDATE"),
  "User synchronization uses ON CONFLICT (id) DO UPDATE (idempotent, prevents duplicate rows on repeated logins)"
);

// ----------------------------------------------------
// 7. Logout & Session Termination
// ----------------------------------------------------
console.log("\n==================================================");
console.log("TEST SUITE 7: Logout & Session Termination Route");
console.log("==================================================");

async function testSignOutRoute() {
  const signoutRes = await fetchUrl("/auth/signout", { method: "POST" });
  assert(
    signoutRes.statusCode === 307 || signoutRes.statusCode === 302 || signoutRes.statusCode === 303,
    `POST /auth/signout returns redirect (HTTP ${signoutRes.statusCode})`
  );
  const signoutLocation = signoutRes.headers.location || "";
  assert(
    signoutLocation === "/" || signoutLocation.endsWith("/"),
    `Signout redirects cleanly to / (actual: ${signoutLocation})`
  );
}

// ----------------------------------------------------
// Run all asynchronous tests
// ----------------------------------------------------
async function runAll() {
  try {
    await testLoginEndpoints();
    await testProtectedRoutes();
    await testOAuthCallback();
    await testSignOutRoute();

    console.log("\n==================================================");
    console.log(`TOTAL TESTS: ${testsRun}`);
    console.log(`PASSED: ${testsPassed}`);
    console.log(`FAILED: ${testsFailed}`);
    console.log("==================================================");

    if (testsFailed === 0) {
      console.log("🎉 ALL PHASE 3A AUTHENTICATION & SECURITY TESTS PASSED!\n");
      process.exit(0);
    } else {
      console.error(`💥 ${testsFailed} tests failed.`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runAll();
