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
      <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender">
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

        <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
          <div className="max-w-md w-full tutr-card bg-white p-8 sm:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-6 shadow-[3px_3px_0px_#18121E]">
              <ShieldAlert className="w-8 h-8 text-rose-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-100 border-2 border-ink px-3 py-1 rounded-full mb-4 shadow-[1px_1px_0px_#18121E]">
              403 Forbidden
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-ink mb-2">
              Access Denied
            </h1>

            <p className="text-sm text-ink/70 mb-6 leading-relaxed font-medium">
              You are signed in as <strong className="text-ink">{user.email}</strong>, but this account does not have administrator privileges.
            </p>

            <div className="p-4 rounded-2xl bg-canvas-lavender border-2 border-ink/40 text-xs text-ink/80 mb-8 text-left space-y-1 font-medium shadow-[2px_2px_0px_rgba(24,18,30,0.1)]">
              <p className="font-bold text-ink mb-1">Server Authorization Check</p>
              <p>User Identity: Validated</p>
              <p>Database Role: <span className="font-mono font-bold text-ink">{profile?.role || "USER"}</span></p>
              <p>Required Role: <span className="font-mono font-bold text-rose-600">ADMIN</span></p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-2 border-ink bg-white hover:bg-gray-50 text-ink font-bold text-xs transition-colors shadow-[2px_2px_0px_#18121E]"
              >
                <ArrowLeft className="w-4 h-4 text-warm-coral" />
                <span>Back to Home</span>
              </Link>
              <SignOutButton className="w-full sm:w-auto" variant="primary" />
            </div>
          </div>
        </main>

        <footer className="text-center py-6 text-xs font-bold text-ink/60 border-t-2 border-ink/20 bg-white/60">
          <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
        </footer>
      </div>
    );
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender">
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

      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-lg w-full tutr-card bg-white p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-mint-badge/30 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-6 shadow-[3px_3px_0px_#18121E]">
            <ShieldCheck className="w-8 h-8 text-emerald-800" />
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ink bg-purple-accent/20 border border-ink px-3 py-1 rounded-full mb-4 shadow-[1px_1px_0px_#18121E]">
            <MapPin className="w-3.5 h-3.5 text-warm-coral" />
            Balasore Administration
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-ink mb-2">
            Welcome, {displayName}
          </h1>

          <p className="text-sm font-bold text-warm-coral mb-6">
            Admin Authorization Verified
          </p>

          <div className="p-4 rounded-2xl bg-canvas-lavender border-2 border-ink/40 text-sm text-ink mb-6 leading-relaxed font-medium shadow-[2px_2px_0px_rgba(24,18,30,0.1)]">
            <p className="font-black text-ink mb-1">Administrative Shell Active</p>
            <p className="text-xs text-ink/70">
              Balasore administrative authority verified. Tutor application ingestion, review lifecycle, and profile provisioning are operational.
            </p>
          </div>

          <div className="mb-8 p-5 rounded-3xl bg-warm-coral/15 border-2 border-ink text-left shadow-[3px_3px_0px_#18121E]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-ink">Application Management</span>
              <span className="text-[10px] bg-mint-badge text-ink border border-ink px-2 py-0.5 rounded-full font-bold shadow-[1px_1px_0px_#18121E]">Live</span>
            </div>
            <h2 className="text-base font-black text-ink mb-1">Tutor Application Queue</h2>
            <p className="text-xs text-ink/70 mb-4 font-medium">
              Review incoming Google Form applications, inspect credentials, and approve verified tutor profiles.
            </p>
            <Link
              href="/admin/applications"
              className="w-full tutr-btn-coral py-2.5 px-5 text-xs flex items-center justify-center gap-2"
            >
              <span>Open Application Queue</span>
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-2 border-ink bg-white hover:bg-gray-50 text-ink font-bold text-xs transition-colors shadow-[2px_2px_0px_#18121E]"
            >
              <ArrowLeft className="w-4 h-4 text-warm-coral" />
              <span>Back to Home</span>
            </Link>
            <SignOutButton className="w-full sm:w-auto" variant="primary" />
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs font-bold text-ink/60 border-t-2 border-ink/20 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
