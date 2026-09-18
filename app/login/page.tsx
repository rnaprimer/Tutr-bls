import React from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, ShieldCheck, MapPin, ArrowLeft } from "lucide-react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { sanitizeNextUrl } from "@/lib/supabase/middleware";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}

export const metadata = {
  title: "Sign In — Tutr Balasore",
  description: "Sign in to Tutr with Google to access your Student, Tutor, or Admin portal.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const safeNext = sanitizeNextUrl(next);

  // Role Context Metadata based on entry point
  let roleBadge = "Welcome to Tutr";
  let roleIcon = <MapPin className="w-3.5 h-3.5 text-teal" />;
  let roleHeading = "Sign in to Tutr";
  let roleDescription = "Learn better, locally. Connecting students and trusted tutors across Balasore, Odisha.";

  if (safeNext === "/student") {
    roleBadge = "Student Entry";
    roleIcon = <BookOpen className="w-3.5 h-3.5 text-teal" />;
    roleHeading = "Student Sign In";
    roleDescription = "Sign in with Google to connect with local tutors across Balasore.";
  } else if (safeNext === "/tutor") {
    roleBadge = "Tutor Entry";
    roleIcon = <GraduationCap className="w-3.5 h-3.5 text-teal" />;
    roleHeading = "Tutor Sign In";
    roleDescription = "Sign in with Google to teach and mentor students in your community.";
  } else if (safeNext === "/admin") {
    roleBadge = "Admin Entry";
    roleIcon = <ShieldCheck className="w-3.5 h-3.5 text-teal" />;
    roleHeading = "Administrator Sign In";
    roleDescription = "Sign in with your verified administrator account to access platform controls.";
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-beige-light/50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar with Logo */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy hover:opacity-90 transition-opacity"
        >
          <span>Tutr</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sky/50 text-navy-dark border border-sky">
            <MapPin className="w-3 h-3 text-teal" />
            Balasore
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/70 hover:text-navy transition-colors py-1.5 px-3 rounded-full hover:bg-beige"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center my-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-navy/10 p-8 sm:p-10 shadow-sm">
          {/* Role Pill Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky/30 border border-sky/70 text-navy text-xs font-semibold uppercase tracking-wider">
              {roleIcon}
              <span>{roleBadge}</span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight mb-2.5">
              {roleHeading}
            </h1>
            <p className="text-sm text-navy/70 leading-relaxed max-w-sm mx-auto">
              {roleDescription}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium leading-relaxed"
            >
              <strong className="font-semibold block mb-0.5">Authentication Note</strong>
              {error}
            </div>
          )}

          {/* Google Sign In Component */}
          <div className="space-y-4">
            <GoogleSignInButton next={safeNext} />
            <p className="text-[11px] text-center text-navy/50 leading-relaxed px-4">
              By continuing with Google, you agree to Tutr&apos;s local learning terms and community standards.
            </p>
          </div>

          {/* Security Notice Footer */}
          <div className="mt-8 pt-6 border-t border-navy/10 flex items-center justify-center gap-2 text-xs text-navy/60">
            <ShieldCheck className="w-4 h-4 text-teal" />
            <span>Secure Supabase Authentication</span>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="text-center text-xs text-navy/50">
        <p>© {new Date().getFullYear()} Tutr • Balasore, Odisha. All rights reserved.</p>
      </footer>
    </div>
  );
}
