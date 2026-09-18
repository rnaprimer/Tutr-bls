import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Privileged Supabase Admin Client.
 * STRICTLY for server-side trusted operations (e.g. webhook ingestion, system maintenance).
 * NEVER expose this or import it in client-side code!
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
