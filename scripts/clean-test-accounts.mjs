/**
 * Safe Test Authentication Accounts Cleanup Script
 * 
 * Objectives:
 * 1. Strictly protects debashismohanty5714@gmail.com and any production ADMIN accounts.
 * 2. Cascades user-owned application/profile data cleanly (respecting ON DELETE SET NULL on tutor_applications).
 * 3. Uses official supabase.auth.admin.deleteUser(id) API to remove auth records.
 * 4. Verifies post-deletion state and administrator login integrity.
 */

import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROTECTED_ADMIN_EMAIL = "debashismohanty5714@gmail.com";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function runCleanup() {
  console.log("==================================================");
  console.log("TUTR AUTH CLEANUP: STEP 1 - INSPECT ACCOUNTS");
  console.log("==================================================");

  // 1. Fetch all users from Supabase Auth
  const { data: { users: authUsers }, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
  if (authErr) {
    throw new Error(`Failed to list auth users: ${authErr.message}`);
  }

  // 2. Fetch all public.users
  const { data: publicUsers, error: pubErr } = await supabaseAdmin
    .from("users")
    .select("id, email, full_name, role");
  if (pubErr) {
    throw new Error(`Failed to list public users: ${pubErr.message}`);
  }

  const pubMap = new Map(publicUsers.map((u) => [u.id, u]));

  // 3. Verify that the primary admin account exists and has role 'ADMIN'
  const mainAdminUser = authUsers.find(
    (u) => u.email?.toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase()
  );

  if (!mainAdminUser) {
    throw new Error(`FATAL: Main admin account ${PROTECTED_ADMIN_EMAIL} was not found in Supabase Auth! Aborting.`);
  }

  const mainAdminProfile = pubMap.get(mainAdminUser.id);
  if (!mainAdminProfile || mainAdminProfile.role !== "ADMIN") {
    throw new Error(`FATAL: Main admin account ${PROTECTED_ADMIN_EMAIL} does not have role 'ADMIN' in public.users! Aborting.`);
  }

  console.log(`✓ Verified Primary Admin Account: ${mainAdminUser.email} (ID: ${mainAdminUser.id})`);
  console.log(`✓ Primary Admin Profile Role: ${mainAdminProfile.role}`);

  // 4. Identify accounts to preserve vs. delete
  const toPreserve = [];
  const toDelete = [];

  for (const user of authUsers) {
    const email = user.email?.toLowerCase() || "";
    const profile = pubMap.get(user.id);
    const role = profile?.role || "NONE";

    if (email === PROTECTED_ADMIN_EMAIL.toLowerCase()) {
      toPreserve.push({ id: user.id, email: user.email, role, reason: "Primary Production Administrator" });
      continue;
    }

    // Check if there are unexpected admin accounts
    if (role === "ADMIN") {
      if (email.startsWith("p4c_admin_") && email.endsWith("@example.com")) {
        toDelete.push({ id: user.id, email: user.email, role, reason: "Synthetic test admin (approved for deletion)" });
      } else {
        throw new Error(
          `SAFETY STOP: Detected unexpected account with ADMIN role: ${user.email} (ID: ${user.id}). Aborting cleanup.`
        );
      }
      continue;
    }

    toDelete.push({ id: user.id, email: user.email, role, reason: "Non-admin / test account" });
  }

  console.log("\n==================================================");
  console.log(`PRESERVED ACCOUNTS (${toPreserve.length}):`);
  console.log("==================================================");
  toPreserve.forEach((u, idx) => {
    console.log(`  [${idx + 1}] ${u.email} | ID: ${u.id} | Role: ${u.role} | Reason: ${u.reason}`);
  });

  console.log("\n==================================================");
  console.log(`ACCOUNTS TO DELETE (${toDelete.length}):`);
  console.log("==================================================");
  toDelete.forEach((u, idx) => {
    console.log(`  [${idx + 1}] ${u.email} | ID: ${u.id} | Role: ${u.role}`);
  });

  console.log("\n==================================================");
  console.log("TUTR AUTH CLEANUP: STEP 2 - EXECUTING DELETIONS");
  console.log("==================================================");

  let successCount = 0;
  let failCount = 0;

  for (const target of toDelete) {
    process.stdout.write(`Deleting ${target.email} (${target.id})... `);

    // Clean up public.users record first (cascading dependent profiles/payments/students, SET NULL on tutor_applications)
    const { error: pubDelErr } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", target.id);

    if (pubDelErr) {
      console.log(`❌ FAILED (public.users): ${pubDelErr.message}`);
      failCount++;
      continue;
    }

    // Now delete from auth.users
    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(target.id);
    if (authDelErr) {
      console.log(`❌ FAILED (auth.users): ${authDelErr.message}`);
      failCount++;
    } else {
      console.log(`✓ DELETED`);
      successCount++;
    }
  }

  console.log("\n==================================================");
  console.log("TUTR AUTH CLEANUP: STEP 3 - POST-CLEANUP VERIFICATION");
  console.log("==================================================");

  // 5. Verify remaining auth accounts
  const { data: { users: remainingAuth } } = await supabaseAdmin.auth.admin.listUsers();
  console.log(`Remaining Auth Users: ${remainingAuth.length}`);
  remainingAuth.forEach((u) => console.log(`  - ${u.email} (ID: ${u.id})`));

  // 6. Verify remaining public.users
  const { data: remainingPub } = await supabaseAdmin.from("users").select("id, email, full_name, role");
  console.log(`\nRemaining Public Users: ${remainingPub.length}`);
  remainingPub.forEach((u) => console.log(`  - ${u.email} | Role: ${u.role}`));

  // 7. Verify main admin is intact
  const adminIntact = remainingPub.find((u) => u.email === PROTECTED_ADMIN_EMAIL && u.role === "ADMIN");
  if (!adminIntact) {
    throw new Error("FATAL POST-VERIFICATION: Main admin account was NOT found or role is not ADMIN!");
  }
  console.log(`\n✓ Verified: ${PROTECTED_ADMIN_EMAIL} is fully intact with role = 'ADMIN'`);

  // 8. Check tutor_applications SET NULL retention
  const { data: apps } = await supabaseAdmin.from("tutor_applications").select("id, email, full_name, user_id, status");
  console.log(`\nTutor Applications in Database: ${apps.length}`);
  const retainedApps = apps.filter((a) => a.user_id === null);
  console.log(`  - Applications with user_id = NULL (retained via SET NULL): ${retainedApps.length}`);
  const linkedApps = apps.filter((a) => a.user_id !== null);
  console.log(`  - Applications still linked to users: ${linkedApps.length}`);
  linkedApps.forEach((a) => console.log(`    * ${a.email} (${a.full_name}) -> user_id: ${a.user_id}`));

  // 9. Summary Report
  console.log("\n==================================================");
  console.log("CLEANUP OPERATION COMPLETE SUMMARY");
  console.log("==================================================");
  console.log(`Total Accounts Evaluated: ${authUsers.length}`);
  console.log(`Total Accounts Deleted:   ${successCount}`);
  console.log(`Total Accounts Preserved: ${toPreserve.length}`);
  console.log(`Deletion Errors:          ${failCount}`);
  console.log("==================================================\n");

  return {
    deletedCount: successCount,
    preservedCount: toPreserve.length,
    remainingAuthCount: remainingAuth.length,
  };
}

// Run if called directly
if (process.argv[1]?.endsWith("clean-test-accounts.mjs")) {
  runCleanup().catch((err) => {
    console.error("\n❌ Fatal Error during cleanup:", err);
    process.exit(1);
  });
}
