import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, ShieldCheck, MapPin, ArrowLeft } from "lucide-react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { sanitizeNextUrl } from "@/lib/supabase/middleware";
import { TutrLogoBook } from "@/components/TutrIllustrations";
import { createClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/role";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    role?: string;
    error?: string;
  }>;
}

export const metadata = {
  title: "Sign In — Tutr Balasore",
  description: "Sign in to Tutr with Google to access your Student, Tutor, or Admin portal.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, role: roleParam, error } = await searchParams;
  const safeNext = sanitizeNextUrl(next);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already authenticated, redirect based on authoritative role
  if (user) {
    const userRole = await resolveUserRole(supabase, user.id);
    if (userRole === "STUDENT") {
      if (roleParam === "TUTOR" || safeNext.startsWith("/tutor")) {
        redirect("/student?notice=registered_as_student");
      }
      redirect("/student");
    }
    if (userRole === "TUTOR") {
      if (roleParam === "STUDENT" || safeNext.startsWith("/student")) {
        redirect("/tutor?notice=registered_as_tutor");
      }
      redirect("/tutor");
    }
    if (userRole === "ADMIN") {
      redirect("/admin");
    }
    if (userRole === "USER") {
      redirect("/select-role");
    }
    redirect(safeNext || "/");
  }

  // Determine effective intended role
  let effectiveRole: string | undefined = undefined;
  if (roleParam === "STUDENT" || roleParam === "TUTOR") {
    effectiveRole = roleParam;
  } else if (safeNext.startsWith("/student")) {
    effectiveRole = "STUDENT";
  } else if (safeNext.startsWith("/tutor")) {
    effectiveRole = "TUTOR";
  }

  // Role Context Metadata based on entry point
  let roleBadge = "Welcome to Tutr";
  let roleIcon = <MapPin className="w-3.5 h-3.5 text-coral" />;
  let roleBadgeBg = "bg-white";
  let roleHeading = "Sign in to Tutr";
  let roleDescription = "Learn better, locally. Connecting students and trusted tutors across Balasore, Odisha.";

  if (effectiveRole === "STUDENT" || safeNext === "/student") {
    roleBadge = "Student Entry";
    roleIcon = <BookOpen className="w-3.5 h-3.5 text-ink" />;
    roleBadgeBg = "bg-honey-light";
    roleHeading = "Student Sign In";
    roleDescription = "Sign in with Google to connect with verified local tutors across Balasore.";
  } else if (effectiveRole === "TUTOR" || safeNext === "/tutor") {
    roleBadge = "Tutor Entry";
    roleIcon = <GraduationCap className="w-3.5 h-3.5 text-ink" />;
    roleBadgeBg = "bg-purple-light";
    roleHeading = "Tutor Sign In";
    roleDescription = "Sign in with Google to teach and mentor students in your community.";
  } else if (safeNext === "/admin") {
    roleBadge = "Admin Entry";
    roleIcon = <ShieldCheck className="w-3.5 h-3.5 text-ink" />;
    roleBadgeBg = "bg-mint-light";
    roleHeading = "Administrator Sign In";
    roleDescription = "Sign in with your verified administrator account to access platform controls.";
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar with Logo */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group"
        >
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink font-sans">
            Tutr
          </span>
          <TutrLogoBook className="w-8 h-8 transition-transform group-hover:rotate-6" />
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-ink border-2 border-ink shadow-[1.5px_1.5px_0px_#18121E]">
            <MapPin className="w-3 h-3 text-coral" />
            Balasore
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:shadow-[3px_3px_0px_#18121E] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all py-1.5 px-4 rounded-full"
        >
          <ArrowLeft className="w-4 h-4 text-coral" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center my-8">
        <div className="max-w-md w-full bg-white rounded-3xl border-2 border-ink p-8 sm:p-10 shadow-[5px_5px_0px_#18121E]">
          {/* Role Pill Badge */}
          <div className="flex justify-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-ink text-ink text-xs font-bold uppercase tracking-wider shadow-[1.5px_1.5px_0px_#18121E] ${roleBadgeBg}`}>
              {roleIcon}
              <span>{roleBadge}</span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mb-2.5 font-sans">
              {roleHeading}
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed max-w-sm mx-auto font-medium">
              {roleDescription}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-xs text-red-800 font-medium leading-relaxed"
            >
              <strong className="font-bold block mb-0.5">Authentication Note</strong>
              {error}
            </div>
          )}

          {/* Google Sign In Component */}
          <div className="space-y-4">
            <GoogleSignInButton next={safeNext} role={effectiveRole} />
            <p className="text-[11px] text-center text-ink-muted leading-relaxed px-4 font-medium">
              By continuing with Google, you agree to Tutr&apos;s local learning terms and community standards.
            </p>
          </div>

          {/* Security Notice Footer */}
          <div className="mt-8 pt-6 border-t-2 border-ink/10 flex items-center justify-center gap-2 text-xs font-bold text-ink-muted">
            <ShieldCheck className="w-4 h-4 text-mint-dark" />
            <span>Secure Supabase Authentication</span>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="text-center text-xs text-ink-muted font-medium">
        <p>© {new Date().getFullYear()} Tutr • Balasore, Odisha. All rights reserved.</p>
      </footer>
    </div>
  );
}
