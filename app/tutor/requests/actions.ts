"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TutorRequestActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action: Accept Tutor Request
 * Only the verified tutor assigned to this request can accept.
 * Atomic status transition from PENDING -> ACCEPTED.
 */
export async function acceptTutorRequestAction(
  requestId: string
): Promise<TutorRequestActionResult> {
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

    const feeConfig = Number(process.env.TUTR_CONNECTION_FEE_INR) || 99;
    const { error } = await supabase.rpc("accept_tutor_request", {
      p_request_id: requestId,
      p_amount: feeConfig,
    });

    if (error) {
      console.error("Error accepting request:", error);
      return {
        success: false,
        error: error.message || "Failed to accept request.",
      };
    }

    revalidatePath("/tutor/requests");
    return { success: true };
  } catch (err: unknown) {
    console.error("Unexpected error in acceptTutorRequestAction:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

/**
 * Server Action: Decline Tutor Request
 * Only the verified tutor assigned to this request can decline.
 * Atomic status transition from PENDING -> DECLINED.
 */
export async function declineTutorRequestAction(
  requestId: string
): Promise<TutorRequestActionResult> {
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

    const { error } = await supabase.rpc("decline_tutor_request", {
      p_request_id: requestId,
    });

    if (error) {
      console.error("Error declining request:", error);
      return {
        success: false,
        error: error.message || "Failed to decline request.",
      };
    }

    revalidatePath("/tutor/requests");
    return { success: true };
  } catch (err: unknown) {
    console.error("Unexpected error in declineTutorRequestAction:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
