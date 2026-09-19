"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SubmitTutorRequestInput {
  tutorId: string;
  subjectId: string;
  classId: string;
  message?: string;
}

export interface SubmitTutorRequestResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

/**
 * Server Action: Submit Tutor Request
 * Only authenticated STUDENT users can submit requests.
 * Database RLS and triggers enforce that:
 * - Requester cannot request themselves
 * - Tutor must be verified
 * - Initial status is strictly PENDING
 * - Duplicate active requests are rejected
 */
export async function submitTutorRequestAction(
  input: SubmitTutorRequestInput
): Promise<SubmitTutorRequestResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be signed in to request a tutor.",
      };
    }

    // Server-side validation of inputs
    if (!input.tutorId) {
      return { success: false, error: "Tutor is required." };
    }
    if (!input.subjectId) {
      return { success: false, error: "Subject is required." };
    }
    if (!input.classId) {
      return { success: false, error: "Class is required." };
    }

    // Call atomic create_tutor_request RPC
    const { data, error } = await supabase.rpc("create_tutor_request", {
      p_tutor_id: input.tutorId,
      p_subject_id: input.subjectId,
      p_class_id: input.classId,
      p_message: input.message?.trim() || undefined,
    });

    if (error) {
      console.error("Error creating tutor request:", error);
      if (
        error.message?.includes("already have an active request") ||
        error.code === "23505"
      ) {
        return {
          success: false,
          error: "You already have an active request with this tutor.",
        };
      }
      return {
        success: false,
        error: error.message || "Failed to submit request. Please try again.",
      };
    }

    const res = data as { success?: boolean; request_id?: string };

    // Revalidate paths
    revalidatePath("/student/requests");
    revalidatePath(`/tutors/${input.tutorId}`);

    return {
      success: true,
      requestId: res.request_id,
    };
  } catch (err: unknown) {
    console.error("Unexpected error in submitTutorRequestAction:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
