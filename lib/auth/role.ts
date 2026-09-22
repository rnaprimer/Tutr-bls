import type { SupabaseClient } from "@supabase/supabase-js";

export type RoleType = "ADMIN" | "TUTOR" | "STUDENT" | "USER" | null;

/**
 * Authoritative role resolver for the application.
 *
 * Source of Truth: public.users.role (PostgreSQL enum public.user_role)
 *
 * Runtime Invariant:
 * - ADMIN -> ADMIN
 * - STUDENT -> STUDENT
 * - TUTOR -> TUTOR
 * - USER -> USER (authenticated unreserved account)
 *
 * Secondary tables (tutor_applications, tutor_profiles, students, Google Form submissions)
 * MUST NEVER be used at runtime to determine or infer the user's permanent account role.
 */
export async function resolveUserRole(
  supabase: SupabaseClient,
  userId?: string | null
): Promise<RoleType> {
  if (!userId) return null;

  try {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const rawRole = (profile?.role || "").toUpperCase();

    if (rawRole === "ADMIN") {
      return "ADMIN";
    }
    if (rawRole === "STUDENT") {
      return "STUDENT";
    }
    if (rawRole === "TUTOR") {
      return "TUTOR";
    }
    if (rawRole === "USER") {
      return "USER";
    }

    return null;
  } catch {
    return null;
  }
}
