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

/**
 * Server Action: Search registered Tutr users for manual application linking.
 */
export async function searchTutrUsers(query: string) {
  const { isAuthenticated, isAdmin } = await verifyAdminSession();
  if (!isAuthenticated || !isAdmin) {
    return { success: false, error: "Unauthorized: Admin privileges required.", users: [] };
  }

  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return { success: true, users: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .or(`email.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%`)
    .limit(10);

  if (error) {
    return { success: false, error: error.message, users: [] };
  }

  return { success: true, users: data || [] };
}

/**
 * Server Action: Manually link an unlinked tutor application to a registered user account.
 */
export async function linkApplicationUser(
  applicationId: string,
  targetUserId: string
): Promise<ActionResponse> {
  const { isAuthenticated, isAdmin } = await verifyAdminSession();
  if (!isAuthenticated || !isAdmin) {
    return {
      success: false,
      error: "Unauthorized: Administrator privileges are required.",
    };
  }

  if (!applicationId || !targetUserId) {
    return {
      success: false,
      error: "Both applicationId and targetUserId are required.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_link_tutor_application_user", {
    p_application_id: applicationId,
    p_target_user_id: targetUserId,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to link applicant account.",
    };
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);

  return {
    success: true,
    message: `Application linked to ${(data as { linked_user_email?: string })?.linked_user_email || targetUserId}.`,
  };
}

