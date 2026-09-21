import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import {
  TutorApplicationStatus,
  type SanitizedTutorApplication,
} from "@/components/tutor/TutorApplicationStatus";
import { generateApplicantToken } from "@/lib/auth/applicant-token";

export const metadata = {
  title: "Tutor Portal — Tutr Balasore",
  description: "Connect with local students across Balasore, Odisha. Tutor application portal.",
};

export default async function TutorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/tutor");
  }

  // Fetch application user profile
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Tutor";

  // Query only the authenticated user's applications governed strictly by RLS
  // Select sanitized fields only: never expose documents, phone, google_response_id, or reviewer info
  const { data: userApplications } = await supabase
    .from("tutor_applications")
    .select("id, full_name, status, submitted_at, updated_at, rejection_reason")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  // Deterministic Application Selection:
  // If multiple applications exist, prioritize active states (APPROVED > UNDER_REVIEW > PENDING)
  // over older rejected submissions, falling back to newest submitted_at
  let primaryApplication: SanitizedTutorApplication | null = null;
  if (userApplications && userApplications.length > 0) {
    const priorityOrder = ["APPROVED", "UNDER_REVIEW", "PENDING", "REJECTED"];
    const sorted = [...userApplications].sort((a, b) => {
      const pA = priorityOrder.indexOf(a.status);
      const pB = priorityOrder.indexOf(b.status);
      if (pA !== pB) return pA - pB;
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
    });
    primaryApplication = sorted[0] as SanitizedTutorApplication;
  }

  // Authoritative Onboarding Fee (fallback to 149 if unset to prevent 500 error during SSR)
  const rawFee = process.env.TUTR_TUTOR_ONBOARDING_FEE_INR;
  const parsedFee = Number(rawFee || 149);
  const fee = Number.isInteger(parsedFee) && parsedFee > 0 ? parsedFee : 149;

  // Query onboarding payment status and profile if application is approved
  let onboardingPaymentStatus: "UNPAID" | "PENDING" | "PAID" | "FAILED" = "UNPAID";
  let tutorProfileId: string | null = null;

  if (primaryApplication && primaryApplication.status === "APPROVED") {
    const { data: profile } = await supabase
      .from("tutor_profiles")
      .select("id, is_active")
      .eq("application_id", primaryApplication.id)
      .maybeSingle();

    if (profile) {
      tutorProfileId = profile.id;
    }

    const { data: payments } = await supabase
      .from("tutor_onboarding_payments")
      .select("id, status")
      .eq("application_id", primaryApplication.id)
      .order("created_at", { ascending: false });

    if (payments && payments.length > 0) {
      const hasPaid = payments.some((p) => p.status === "PAID");
      if (hasPaid || profile?.is_active) {
        onboardingPaymentStatus = "PAID";
      } else {
        const latest = payments[0];
        if (latest.status === "FAILED" || latest.status === "CANCELLED") {
          onboardingPaymentStatus = "FAILED";
        } else {
          onboardingPaymentStatus = "PENDING";
        }
      }
    } else if (profile?.is_active) {
      onboardingPaymentStatus = "PAID";
    } else {
      onboardingPaymentStatus = "UNPAID";
    }
  }

  const baseFormUrl = process.env.NEXT_PUBLIC_TUTOR_APPLICATION_FORM_URL;
  let formUrl = baseFormUrl;

  // If a form URL is configured, attach fresh signed applicant token
  if (baseFormUrl && user?.id) {
    try {
      const applicantToken = generateApplicantToken(user.id);
      // Support customizable entry ID via env, or standard parameter 'tutr_token'
      const entryParam = process.env.NEXT_PUBLIC_TUTOR_FORM_TOKEN_ENTRY || "tutr_token";
      const separator = baseFormUrl.includes("?") ? "&" : "?";
      formUrl = `${baseFormUrl}${separator}${encodeURIComponent(entryParam)}=${encodeURIComponent(applicantToken)}`;
    } catch (err) {
      console.error("[Applicant Token Error]", err);
      formUrl = baseFormUrl;
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender">
      {/* Top Portal Header */}
      <header className="w-full bg-white/80 backdrop-blur border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink"
          >
            <span>Tutr</span>
            <span className="font-handwritten text-base px-2.5 py-0.5 rounded-full bg-honey/30 text-ink border border-ink shadow-[1px_1px_0px_#18121E]">
              Balasore
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-ink/70">
              <User className="w-4 h-4 text-warm-coral" />
              <span>{user.email}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Tutor Application Experience */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
        <TutorApplicationStatus
          application={primaryApplication}
          displayName={displayName}
          formUrl={formUrl}
          onboardingPaymentStatus={onboardingPaymentStatus}
          tutorProfileId={tutorProfileId}
          feeInr={fee}
        />
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs font-bold text-ink/60 border-t-2 border-ink/20 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
