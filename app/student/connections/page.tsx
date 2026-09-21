import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MapPin,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  BookOpen,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignOutButton } from "@/components/SignOutButton";
import { UnlockContactButton } from "@/components/payment/UnlockContactButton";
import { UnlockedContactsResponse } from "@/lib/razorpay/client";

export const metadata = {
  title: "My Connections — Tutr Balasore",
  description: "View your accepted tuition connections and unlocked educator contact details.",
};

export default async function StudentConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/student/connections");
  }

  // Find student profile
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student) {
    redirect("/student");
  }

  const admin = createAdminClient();

  // Fetch student's connections strictly scoped to student.id
  const { data: rawConnections, error } = await admin
    .from("tutor_connections")
    .select(
      `
      id,
      status,
      payment_status,
      amount,
      currency,
      paid_at,
      contact_unlocked_at,
      created_at,
      request:tutor_requests(
        id,
        status,
        subject:subjects(name),
        class:classes(name)
      ),
      tutor:tutor_profiles(
        id,
        display_name,
        locality,
        fee
      )
    `
    )
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching student connections:", error);
  }

  const connections = rawConnections || [];

  // For each unlocked connection, fetch verified contacts via secure RPC
  const connectionsWithContacts = await Promise.all(
    connections.map(async (conn) => {
      let contacts: UnlockedContactsResponse | null = null;
      if (conn.status === "CONTACT_UNLOCKED") {
        const { data } = await admin.rpc("get_unlocked_connection_contacts", {
          p_connection_id: conn.id,
        });
        contacts = data as unknown as UnlockedContactsResponse;
      }
      return { ...conn, contacts };
    })
  );

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender">
      {/* Top Header */}
      <header className="w-full bg-white/80 backdrop-blur border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink"
            >
              <span>Tutr</span>
              <span className="font-handwritten text-base px-2.5 py-0.5 rounded-full bg-honey/30 text-ink border border-ink shadow-[1px_1px_0px_#18121E]">
                Balasore
              </span>
            </Link>
            <span className="hidden sm:inline-block text-xs font-black uppercase tracking-wider text-ink bg-purple-accent/20 border border-ink px-3 py-0.5 rounded-full shadow-[1px_1px_0px_#18121E]">
              Connections & Contact Unlock
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/requests"
              className="text-xs font-bold text-ink/70 hover:text-ink px-3 py-1.5 rounded-full hover:bg-white/60 transition-colors"
            >
              My Requests
            </Link>
            <Link
              href="/tutors"
              className="text-xs font-bold text-ink hover:text-warm-coral px-3 py-1.5 rounded-full border-2 border-ink bg-white shadow-[2px_2px_0px_#18121E] transition-colors"
            >
              Find Tutors
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60 mb-1">
              <Link href="/student" className="hover:text-warm-coral">
                Student Portal
              </Link>
              <span>/</span>
              <span className="text-ink font-black">Connections</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              Tutor Connections
            </h1>
            <p className="text-xs text-ink/70 font-medium mt-1">
              When a verified educator accepts your inquiry, unlock their direct phone and email here.
            </p>
          </div>

          <Link
            href="/tutors"
            className="tutr-btn-student py-2 px-4 text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Browse More Tutors</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Connections List */}
        {connectionsWithContacts.length === 0 ? (
          <div className="tutr-card bg-white p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-purple-accent/20 border-2 border-ink text-ink flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#18121E]">
              <Sparkles className="w-8 h-8 text-warm-coral" />
            </div>
            <h2 className="text-xl font-black text-ink mb-2">
              No active connections yet.
            </h2>
            <p className="text-xs text-ink/70 leading-relaxed mb-6 font-medium">
              When an educator accepts your tuition request, an official connection is created here for you to unlock direct communication.
            </p>
            <Link
              href="/tutors"
              className="tutr-btn-student py-2.5 px-6 text-xs inline-flex items-center gap-2"
            >
              <span>Explore Verified Tutors</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {connectionsWithContacts.map((conn) => {
              const tutor = conn.tutor;
              const subjectName = conn.request?.subject?.name || "Tuition";
              const className = conn.request?.class?.name || "All Classes";
              const isUnlocked = conn.status === "CONTACT_UNLOCKED";
              const unlockedTutor = conn.contacts?.tutor;

              return (
                <div
                  key={conn.id}
                  className={`tutr-card bg-white p-6 sm:p-8 ${
                    isUnlocked ? "bg-mint-badge/5 border-emerald-800" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-black text-ink">
                          Tutor: {tutor?.display_name || "Verified Tutor"}
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink bg-mint-badge/40 px-2.5 py-0.5 rounded-full border border-ink shadow-[1px_1px_0px_#18121E]">
                          <ShieldCheck className="w-3 h-3 text-emerald-800" />
                          Verified
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/70 font-medium">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-warm-coral" />
                          <span>Subject: {subjectName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-warm-coral" />
                          <span>Class: {className}</span>
                        </div>
                        {tutor?.locality && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-warm-coral" />
                            <span>{tutor.locality}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink/60 font-bold">Request:</span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-ink bg-mint-badge/40 px-2.5 py-0.5 rounded-full border border-ink shadow-[1px_1px_0px_#18121E]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-800" />
                          Accepted
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-ink/60 font-bold">Payment:</span>
                        {isUnlocked ? (
                          <span className="text-xs font-black text-emerald-800">
                            Successful
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-700">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unlocked State vs Locked State */}
                  {isUnlocked && unlockedTutor ? (
                    <div className="p-5 rounded-2xl bg-mint-badge/20 border-2 border-ink text-xs text-ink space-y-3 shadow-[2px_2px_0px_#18121E]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-black text-ink text-sm">
                          <ShieldCheck className="w-4 h-4 text-emerald-800" />
                          <span>Direct Educator Contact Details</span>
                        </div>
                        <span className="text-[11px] font-bold text-ink/60">
                          Unlocked on{" "}
                          {conn.contact_unlocked_at
                            ? new Date(conn.contact_unlocked_at).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short", year: "numeric" }
                              )
                            : "Recently"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {unlockedTutor.phone && (
                          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                            <Phone className="w-4 h-4 text-emerald-800 shrink-0" />
                            <div>
                              <span className="text-[10px] uppercase font-bold text-ink/50 block">
                                Phone Number
                              </span>
                              <a
                                href={`tel:${unlockedTutor.phone}`}
                                className="font-black text-ink text-sm hover:text-warm-coral"
                              >
                                {unlockedTutor.phone}
                              </a>
                            </div>
                          </div>
                        )}

                        {unlockedTutor.email && (
                          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                            <Mail className="w-4 h-4 text-emerald-800 shrink-0" />
                            <div>
                              <span className="text-[10px] uppercase font-bold text-ink/50 block">
                                Email Address
                              </span>
                              <a
                                href={`mailto:${unlockedTutor.email}`}
                                className="font-black text-ink text-sm hover:text-warm-coral"
                              >
                                {unlockedTutor.email}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-ink/70 font-medium">
                        You can now call or message this verified tutor directly to finalize tuition timing and batch details.
                      </p>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-canvas-lavender border-2 border-ink flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[2px_2px_0px_#18121E]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-black text-ink">
                          <Lock className="w-3.5 h-3.5 text-warm-coral" />
                          <span>Contact details locked</span>
                        </div>
                        <p className="text-[11px] text-ink/70 font-medium leading-relaxed">
                          Pay the one-time Tutr connection fee of ₹{conn.amount} to unlock this tutor&apos;s direct phone number and email address.
                        </p>
                      </div>

                      <div className="shrink-0">
                        <UnlockContactButton
                          connectionId={conn.id}
                          amount={Number(conn.amount)}
                          currency={conn.currency}
                          tutorName={tutor?.display_name || "Tutor"}
                          isUnlocked={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs font-bold text-ink/60 border-t-2 border-ink/20 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
