import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, ShieldAlert, ArrowLeft, User, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata = {
  title: "Admin Portal — Tutr Balasore",
  description: "Administrative verification and review portal for Tutr Balasore.",
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  // Strictly verify authorization from public.users record
  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-beige-light/40">
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

        <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
          <div className="max-w-md w-full bg-white rounded-3xl border border-red-200 p-8 sm:p-12 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto mb-6">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-700 bg-red-100 px-3 py-1 rounded-full mb-4">
              403 Forbidden
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy mb-2">
              Access Denied
            </h1>

            <p className="text-sm text-navy/70 mb-6 leading-relaxed">
              You are signed in as <strong className="text-navy">{user.email}</strong>, but this account does not have administrator privileges.
            </p>

            <div className="p-4 rounded-2xl bg-beige-light/80 border border-navy/10 text-xs text-navy/70 mb-8 text-left">
              <p className="font-semibold text-navy mb-1">Server Authorization Check</p>
              <p>User Identity: Validated</p>
              <p>Database Role: <span className="font-mono text-navy">{profile?.role || "USER"}</span></p>
              <p>Required Role: <span className="font-mono text-red-600">ADMIN</span></p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-medium text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-teal" />
                <span>Back to Home</span>
              </Link>
              <SignOutButton className="w-full sm:w-auto" variant="primary" />
            </div>
          </div>
        </main>

        <footer className="text-center py-6 text-xs text-navy/50 border-t border-navy/10 bg-white/60">
          <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
        </footer>
      </div>
    );
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen flex flex-col justify-between bg-beige-light/40">
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

      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-navy/10 p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal/10 border border-teal/30 flex items-center justify-center text-teal mx-auto mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal bg-sky/30 px-3 py-1 rounded-full mb-4">
            <MapPin className="w-3.5 h-3.5" />
            Balasore Administration
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy mb-2">
            Welcome, {displayName}
          </h1>

          <p className="text-sm font-semibold text-teal mb-6">
            Admin Authorization Verified
          </p>

          <div className="p-4 rounded-2xl bg-beige-light/80 border border-navy/10 text-sm text-navy/80 mb-6 leading-relaxed">
            <p className="font-semibold text-navy mb-1">Administrative Shell Active</p>
            <p className="text-xs text-navy/70">
              Balasore administrative authority verified. Tutor application ingestion, review lifecycle, and profile provisioning are operational.
            </p>
          </div>

          <div className="mb-8 p-5 rounded-2xl bg-teal/5 border border-teal/20 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-dark">Application Management</span>
              <span className="text-[10px] bg-teal/15 text-teal-dark px-2 py-0.5 rounded-full font-semibold">Phase 4C Live</span>
            </div>
            <h2 className="text-base font-bold text-navy mb-1">Tutor Application Queue</h2>
            <p className="text-xs text-navy/70 mb-4">
              Review incoming Google Form applications, inspect credentials, and approve verified tutor profiles.
            </p>
            <Link
              href="/admin/applications"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-colors shadow-xs"
            >
              <span>Open Application Queue</span>
              <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-teal" />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-medium text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-teal" />
              <span>Back to Home</span>
            </Link>
            <SignOutButton className="w-full sm:w-auto" variant="primary" />
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-navy/50 border-t border-navy/10 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
