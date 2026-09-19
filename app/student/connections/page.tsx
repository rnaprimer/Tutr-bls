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
    <div className="min-h-screen flex flex-col justify-between bg-beige-light/30">
      {/* Top Header */}
      <header className="w-full bg-white/95 border-b border-navy/10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
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
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-teal bg-sky/30 px-3 py-0.5 rounded-full">
              Connections & Contact Unlock
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/requests"
              className="text-xs font-semibold text-navy/70 hover:text-navy px-3 py-1.5 rounded-full hover:bg-beige/60 transition-colors"
            >
              My Requests
            </Link>
            <Link
              href="/tutors"
              className="text-xs font-semibold text-teal-dark hover:text-navy px-3 py-1.5 rounded-full border border-teal/30 hover:bg-beige/60 transition-colors"
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
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy/60 mb-1">
              <Link href="/student" className="hover:text-navy">
                Student Portal
              </Link>
              <span>/</span>
              <span className="text-navy font-bold">Connections</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              Tutor Connections
            </h1>
            <p className="text-xs text-navy/60 mt-1">
              When a verified educator accepts your inquiry, unlock their direct phone and email here.
            </p>
          </div>

          <Link
            href="/tutors"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-all self-start sm:self-auto"
          >
            <span>Browse More Tutors</span>
            <ArrowRight className="w-3.5 h-3.5 text-teal" />
          </Link>
        </div>

        {/* Connections List */}
        {connectionsWithContacts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-navy/10 p-8 sm:p-12 text-center shadow-sm max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-sky/30 text-teal flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-navy mb-2">
              No active connections yet.
            </h2>
            <p className="text-xs text-navy/60 leading-relaxed mb-6">
              When an educator accepts your tuition request, an official connection is created here for you to unlock direct communication.
            </p>
            <Link
              href="/tutors"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-colors"
            >
              <span>Explore Verified Tutors</span>
              <ArrowRight className="w-4 h-4 text-teal" />
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
                  className={`bg-white rounded-2xl border transition-all p-6 sm:p-8 shadow-sm ${
                    isUnlocked
                      ? "border-emerald-200 ring-1 ring-emerald-100"
                      : "border-navy/10"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-navy">
                          Tutor: {tutor?.display_name || "Verified Tutor"}
                        </h2>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy/70">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-teal" />
                          <span>Subject: {subjectName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-teal" />
                          <span>Class: {className}</span>
                        </div>
                        {tutor?.locality && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-teal" />
                            <span>{tutor.locality}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-navy/60 font-medium">Request:</span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Accepted
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-navy/60 font-medium">Payment:</span>
                        {isUnlocked ? (
                          <span className="text-xs font-bold text-emerald-700">
                            Successful
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-600">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unlocked State vs Locked State */}
                  {isUnlocked && unlockedTutor ? (
                    <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-navy space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          <span>Direct Educator Contact Details</span>
                        </div>
                        <span className="text-[11px] text-navy/50">
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
                          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100">
                            <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
                            <div>
                              <span className="text-[10px] uppercase font-bold text-navy/40 block">
                                Phone Number
                              </span>
                              <a
                                href={`tel:${unlockedTutor.phone}`}
                                className="font-bold text-navy text-sm hover:text-teal"
                              >
                                {unlockedTutor.phone}
                              </a>
                            </div>
                          </div>
                        )}

                        {unlockedTutor.email && (
                          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-emerald-100">
                            <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
                            <div>
                              <span className="text-[10px] uppercase font-bold text-navy/40 block">
                                Email Address
                              </span>
                              <a
                                href={`mailto:${unlockedTutor.email}`}
                                className="font-bold text-navy text-sm hover:text-teal"
                              >
                                {unlockedTutor.email}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-navy/60">
                        You can now call or message this verified tutor directly to finalize tuition timing and batch details.
                      </p>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-beige-light/70 border border-navy/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-navy">
                          <Lock className="w-3.5 h-3.5 text-teal" />
                          <span>Contact details locked</span>
                        </div>
                        <p className="text-[11px] text-navy/60 leading-relaxed">
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
      <footer className="text-center py-6 text-xs text-navy/50 border-t border-navy/10 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
