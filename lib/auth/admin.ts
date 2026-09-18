import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "USER" | "STUDENT" | "TUTOR" | "ADMIN";
}

export interface AdminAuthResult {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  profile: AdminProfile | null;
}

/**
 * Server-side administrator session verification.
 * Strictly queries public.users under active session to verify role = 'ADMIN'.
 * Never trusts cookies, query params, or client claims.
 */
export async function verifyAdminSession(): Promise<AdminAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      user: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN";

  return {
    isAuthenticated: true,
    isAdmin,
    user,
    profile: profile as AdminProfile | null,
  };
}
