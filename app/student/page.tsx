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

interface StudentPageProps {
  searchParams?: Promise<{
    notice?: string;
  }>;
}

export default async function StudentPage({ searchParams }: StudentPageProps) {
  const { notice } = (await searchParams) || {};
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

      {/* Main Student Shell Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="max-w-2xl w-full tutr-card bg-white p-8 sm:p-12 text-center">
          {/* Role Mismatch Notice */}
          {notice === "registered_as_student" && (
            <div
              role="alert"
              className="mb-8 p-4 rounded-2xl bg-honey-light border-2 border-ink text-xs font-bold text-ink text-left shadow-[2.5px_2.5px_0px_#18121E]"
            >
              <div className="flex items-center gap-2 mb-1 text-coral font-black">
                <BookOpen className="w-4 h-4" />
                <span className="uppercase tracking-wider text-[11px]">Role Information</span>
              </div>
              <p className="text-ink/80 leading-relaxed font-medium">
                This Google account is registered as a <strong>Student</strong>. You cannot switch this account to Tutor.
              </p>
            </div>
          )}

          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-honey/30 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-6 shadow-[3px_3px_0px_#18121E]">
            <BookOpen className="w-8 h-8 text-warm-coral" />
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ink bg-purple-accent/20 border border-ink px-3 py-1 rounded-full mb-4 shadow-[1px_1px_0px_#18121E]">
            <MapPin className="w-3.5 h-3.5 text-warm-coral" />
            Balasore, Odisha
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-ink mb-2">
            Welcome, {displayName}
          </h1>

          <p className="text-sm font-bold text-warm-coral mb-8">
            Student Dashboard
          </p>

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
            <Link
              href="/tutors"
              className="p-5 rounded-2xl bg-warm-coral/10 hover:bg-warm-coral/15 border-2 border-ink shadow-[3px_3px_0px_#18121E] transition-all hover:translate-y-[-2px] group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-warm-coral border-2 border-ink text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-[2px_2px_0px_#18121E]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-black text-ink mb-1">
                  Find a Tutor
                </h2>
                <p className="text-xs text-ink/70 leading-normal font-medium">
                  Explore verified educators across Balasore localities. Filter by subject, class, and fee.
                </p>
              </div>
              <span className="text-xs font-bold text-warm-coral mt-4 inline-flex items-center gap-1">
                Browse Directory →
              </span>
            </Link>

            <Link
              href="/student/requests"
              className="p-5 rounded-2xl bg-honey/20 hover:bg-honey/25 border-2 border-ink shadow-[3px_3px_0px_#18121E] transition-all hover:translate-y-[-2px] group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-honey border-2 border-ink text-ink flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-[2px_2px_0px_#18121E]">
                  <MapPin className="w-5 h-5 text-ink" />
                </div>
                <h2 className="text-sm font-black text-ink mb-1">
                  My Requests
                </h2>
                <p className="text-xs text-ink/70 leading-normal font-medium">
                  View and manage your submitted tutor inquiries, pending reviews, and responses.
                </p>
              </div>
              <span className="text-xs font-bold text-ink mt-4 inline-flex items-center gap-1">
                View Requests →
              </span>
            </Link>

            <Link
              href="/student/connections"
              className="p-5 rounded-2xl bg-purple-accent/20 hover:bg-purple-accent/25 border-2 border-ink shadow-[3px_3px_0px_#18121E] transition-all hover:translate-y-[-2px] group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-mint-badge border-2 border-ink text-ink flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-[2px_2px_0px_#18121E]">
                  <ShieldCheck className="w-5 h-5 text-emerald-800" />
                </div>
                <h2 className="text-sm font-black text-ink mb-1">
                  My Connections
                </h2>
                <p className="text-xs text-ink/70 leading-normal font-medium">
                  Unlock educator contact details and manage your active tuition connections.
                </p>
              </div>
              <span className="text-xs font-bold text-ink mt-4 inline-flex items-center gap-1">
                View Connections →
              </span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-2 border-ink bg-white font-bold text-ink text-xs hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_#18121E]"
            >
              <ArrowLeft className="w-4 h-4 text-warm-coral" />
              <span>Back to Home</span>
            </Link>
            <SignOutButton className="w-full sm:w-auto" variant="primary" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs font-bold text-ink/60 border-t-2 border-ink/20 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
