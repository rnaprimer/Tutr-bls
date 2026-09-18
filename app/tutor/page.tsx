import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import {
  TutorApplicationStatus,
  type SanitizedTutorApplication,
} from "@/components/tutor/TutorApplicationStatus";

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

  const formUrl = process.env.NEXT_PUBLIC_TUTOR_APPLICATION_FORM_URL;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-beige-light/40">
      {/* Top Portal Header */}
      <header className="w-full bg-white/95 border-b border-navy/10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy"
          >
            <span>Tutr</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sky/50 text-navy-dark border border-sky">
              <MapPin className="w-3 h-3 text-teal" />
              Balasore
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-navy/70">
              <User className="w-4 h-4 text-teal" />
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
        />
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-navy/50 border-t border-navy/10 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
