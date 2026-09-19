"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CancelRequestResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action: Cancel Tutor Request
 * Only the requesting student can cancel their own PENDING request.
 * Enforced via cancel_tutor_request RPC and database RLS.
 */
export async function cancelTutorRequestAction(
  requestId: string
): Promise<CancelRequestResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    if (!requestId) {
      return { success: false, error: "Request ID is required." };
    }

    const { error } = await supabase.rpc("cancel_tutor_request", {
      p_request_id: requestId,
    });

    if (error) {
      console.error("Error cancelling request:", error);
      return {
        success: false,
        error: error.message || "Failed to cancel request.",
      };
    }

    revalidatePath("/student/requests");
    return { success: true };
  } catch (err: unknown) {
    console.error("Unexpected error in cancelTutorRequestAction:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
