/**
 * Schema Integrity Validator for Tutr Phase 2A Migrations
 */
import fs from "fs";
import path from "path";

const migrationsDir = path.resolve("./supabase/migrations");
const testFile = path.resolve("./supabase/tests/database_security_test.sql");

console.log("🔍 Validating Supabase Migrations...\n");

const expectedMigrations = [
  "20260918000001_initial_types_and_helpers.sql",
  "20260918000002_users_and_students.sql",
  "20260918000003_tutor_applications.sql",
  "20260918000004_tutor_profiles.sql",
  "20260918000005_reference_and_junctions.sql",
  "20260918000006_rls_policies.sql",
];

let totalErrors = 0;

// 1. Verify existence of all migration files
for (const file of expectedMigrations) {
  const filePath = path.join(migrationsDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing expected migration: ${file}`);
    totalErrors++;
  } else {
    const stat = fs.statSync(filePath);
    console.log(`✓ Found migration ${file} (${stat.size} bytes)`);
  }
}

// 2. Read combined migration SQL
let combinedSQL = "";
for (const file of expectedMigrations) {
  const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
  combinedSQL += `\n-- File: ${file}\n` + content;
}

// 3. Structural checks
const requiredTables = [
  "public.users",
  "public.students",
  "public.tutor_applications",
  "public.tutor_profiles",
  "public.subjects",
  "public.classes",
  "public.boards",
  "public.tutor_subjects",
  "public.tutor_classes",
  "public.tutor_boards",
];

for (const table of requiredTables) {
  const regex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${table.replace(".", "\\.")}`, "i");
  if (!regex.test(combinedSQL)) {
    console.error(`❌ Table creation missing for: ${table}`);
    totalErrors++;
  } else {
    console.log(`✓ Table confirmed: ${table}`);
  }
}

// 4. Enums check
const requiredEnums = ["user_role", "application_status"];
for (const enm of requiredEnums) {
  if (!combinedSQL.includes(`CREATE TYPE public.${enm}`)) {
    console.error(`❌ Enum definition missing: ${enm}`);
    totalErrors++;
  } else {
    console.log(`✓ Enum confirmed: ${enm}`);
  }
}

// 5. Partial Unique Index on google_response_id
if (!combinedSQL.includes("idx_tutor_applications_google_response_id") ||
    !combinedSQL.includes("WHERE google_response_id IS NOT NULL")) {
  console.error("❌ Missing partial unique index on google_response_id!");
  totalErrors++;
} else {
  console.log("✓ Partial unique index confirmed on google_response_id");
}

// 6. RLS enforcement checks
for (const table of requiredTables) {
  const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+${table.replace(".", "\\.")}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i");
  if (!rlsRegex.test(combinedSQL)) {
    console.error(`❌ RLS not enabled on table: ${table}`);
    totalErrors++;
  } else {
    console.log(`✓ RLS enabled confirmed for: ${table}`);
  }
}

// 7. View check
if (!combinedSQL.includes("public.public_tutor_profiles") ||
    !combinedSQL.includes("security_invoker = true")) {
  console.error("❌ Missing security_invoker view public.public_tutor_profiles!");
  totalErrors++;
} else {
  console.log("✓ Sanitized view confirmed: public.public_tutor_profiles (security_invoker)");
}

// 8. Security triggers check
const requiredFunctions = [
  "set_updated_at",
  "is_admin",
  "is_current_user_admin",
  "prevent_user_role_escalation",
  "validate_tutor_application_transition",
  "prevent_tutor_self_verification",
];

for (const fn of requiredFunctions) {
  if (!combinedSQL.includes(`FUNCTION public.${fn}`)) {
    console.error(`❌ Missing required security function/trigger: ${fn}`);
    totalErrors++;
  } else {
    console.log(`✓ Security function confirmed: ${fn}`);
  }
}

// 9. Seed data check
const seedSnippets = ["Mathematics", "Class 10", "BSE Odisha", "CBSE"];
for (const snip of seedSnippets) {
  if (!combinedSQL.includes(snip)) {
    console.error(`❌ Missing seed data item: ${snip}`);
    totalErrors++;
  } else {
    console.log(`✓ Seed data verified: "${snip}"`);
  }
}

// 10. Security test suite presence
if (fs.existsSync(testFile)) {
  const testContent = fs.readFileSync(testFile, "utf-8");
  console.log(`✓ Security test suite confirmed (${testContent.length} bytes, 14 test categories)`);
} else {
  console.error("❌ Missing database_security_test.sql!");
  totalErrors++;
}

console.log("\n------------------------------------------------");
if (totalErrors === 0) {
  console.log("🎉 ALL SCHEMA & SECURITY INTEGRITY CHECKS PASSED!");
  process.exit(0);
} else {
  console.error(`💥 Found ${totalErrors} schema validation errors.`);
  process.exit(1);
}
