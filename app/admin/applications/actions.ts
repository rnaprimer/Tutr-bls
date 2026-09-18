"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";

export interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Server Action: Start review on a PENDING application (transitions to UNDER_REVIEW).
 */
export async function startApplicationReview(
  applicationId: string
): Promise<ActionResponse> {
  const { isAuthenticated, isAdmin } = await verifyAdminSession();

  if (!isAuthenticated || !isAdmin) {
    return {
      success: false,
      error: "Unauthorized: Administrator privileges are required.",
    };
  }

  if (!applicationId || typeof applicationId !== "string") {
    return {
      success: false,
      error: "Invalid application ID provided.",
    };
  }

  const supabase = await createClient();

  // Invoke atomic database transition function
  const { error } = await supabase.rpc("start_tutor_application_review", {
    p_application_id: applicationId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to transition application to UNDER_REVIEW.",
    };
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);

  return {
    success: true,
    message: "Application moved to UNDER_REVIEW.",
  };
}

/**
 * Server Action: Approve application with atomic tutor profile provisioning.
 */
export async function approveApplication(
  applicationId: string
): Promise<ActionResponse> {
  const { isAuthenticated, isAdmin } = await verifyAdminSession();

  if (!isAuthenticated || !isAdmin) {
    return {
      success: false,
      error: "Unauthorized: Administrator privileges are required.",
    };
  }

  if (!applicationId || typeof applicationId !== "string") {
    return {
      success: false,
      error: "Invalid application ID provided.",
    };
  }

  const supabase = await createClient();

  // Invoke atomic database approval and tutor-profile provisioning function
  const { error } = await supabase.rpc("approve_tutor_application", {
    p_application_id: applicationId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to approve application and provision tutor profile.",
    };
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);

  return {
    success: true,
    message: "Application approved and verified tutor profile provisioned.",
  };
}

/**
 * Server Action: Reject application with a validated reason.
 */
export async function rejectApplication(
  applicationId: string,
  reason: string
): Promise<ActionResponse> {
  const { isAuthenticated, isAdmin } = await verifyAdminSession();

  if (!isAuthenticated || !isAdmin) {
    return {
      success: false,
      error: "Unauthorized: Administrator privileges are required.",
    };
  }

  if (!applicationId || typeof applicationId !== "string") {
    return {
      success: false,
      error: "Invalid application ID provided.",
    };
  }

  const trimmedReason = (reason || "").trim();
  if (!trimmedReason || trimmedReason.length < 3) {
    return {
      success: false,
      error: "A valid rejection reason of at least 3 characters is required.",
    };
  }

  if (trimmedReason.length > 1000) {
    return {
      success: false,
      error: "Rejection reason cannot exceed 1000 characters.",
    };
  }

  const supabase = await createClient();

  // Invoke atomic database rejection function
  const { error } = await supabase.rpc("reject_tutor_application", {
    p_application_id: applicationId,
    p_rejection_reason: trimmedReason,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to reject application.",
    };
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);

  return {
    success: true,
    message: "Application rejected.",
  };
}
