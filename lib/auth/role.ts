import type { SupabaseClient } from "@supabase/supabase-js";

export type RoleType = "ADMIN" | "TUTOR" | "STUDENT" | null;

/**
 * Authoritative role resolver for the application.
 *
 * Priority order:
 * 1. public.users.role === 'ADMIN' -> ADMIN
 * 2. public.users.role === 'STUDENT' -> STUDENT
 * 3. public.users.role === 'TUTOR' -> TUTOR
 * 4. public.users.role === 'USER' (default tier):
 *    - Has active record in public.tutor_profiles -> TUTOR
 *    - Has record in public.students -> STUDENT
 *    - Default registered user persona -> STUDENT
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

    // Default 'USER' tier:
    // Check if user is an onboarded tutor with a tutor profile:
    const { data: tutorProfile } = await supabase
      .from("tutor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (tutorProfile) {
      return "TUTOR";
    }

    // Check if user has an active student record:
    const { data: studentProfile } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (studentProfile) {
      return "STUDENT";
    }

    // Default registered non-tutor user is a learner/student
    return "STUDENT";
  } catch {
    return null;
  }
}
