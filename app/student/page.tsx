import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, MapPin, ArrowLeft, User, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata = {
  title: "Student Portal — Tutr Balasore",
  description: "Find local tutors across Balasore, Odisha. Student portal.",
};

export default async function StudentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/student");
  }

  // Fetch application user profile
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, avatar_url, role")
    .eq("id", user.id)
    .single();

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";

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

      {/* Main Student Shell Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-navy/10 p-8 sm:p-12 shadow-sm text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-sky/40 border border-sky flex items-center justify-center text-teal mx-auto mb-6">
            <BookOpen className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal bg-sky/30 px-3 py-1 rounded-full mb-4">
            <MapPin className="w-3.5 h-3.5" />
            Balasore, Odisha
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy mb-2">
            Welcome, {displayName}
          </h1>

          <p className="text-sm font-semibold text-teal mb-8">
            Student Portal
          </p>

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
            <Link
              href="/tutors"
              className="p-5 rounded-2xl bg-beige-light/70 hover:bg-beige-light border border-navy/10 transition-all hover:shadow-sm group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal/15 text-teal-dark flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5 text-teal" />
                </div>
                <h2 className="text-sm font-bold text-navy mb-1">
                  Find a Tutor
                </h2>
                <p className="text-xs text-navy/70 leading-normal">
                  Explore verified educators across Balasore localities. Filter by subject, class, and fee.
                </p>
              </div>
              <span className="text-xs font-semibold text-teal-dark mt-4 inline-flex items-center gap-1">
                Browse Marketplace →
              </span>
            </Link>

            <Link
              href="/student/requests"
              className="p-5 rounded-2xl bg-beige-light/70 hover:bg-beige-light border border-navy/10 transition-all hover:shadow-sm group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky/50 text-navy flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5 text-teal" />
                </div>
                <h2 className="text-sm font-bold text-navy mb-1">
                  My Requests
                </h2>
                <p className="text-xs text-navy/70 leading-normal">
                  View and manage your submitted tutor inquiries, pending reviews, and responses.
                </p>
              </div>
              <span className="text-xs font-semibold text-teal-dark mt-4 inline-flex items-center gap-1">
                View Requests →
              </span>
            </Link>

            <Link
              href="/student/connections"
              className="p-5 rounded-2xl bg-beige-light/70 hover:bg-beige-light border border-navy/10 transition-all hover:shadow-sm group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <h2 className="text-sm font-bold text-navy mb-1">
                  My Connections
                </h2>
                <p className="text-xs text-navy/70 leading-normal">
                  Unlock educator contact details and manage your active tuition connections.
                </p>
              </div>
              <span className="text-xs font-semibold text-teal-dark mt-4 inline-flex items-center gap-1">
                View Connections →
              </span>
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

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-navy/50 border-t border-navy/10 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
