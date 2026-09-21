import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Slash,
  BookOpen,
  GraduationCap,
  IndianRupee,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { CancelRequestButton } from "./CancelRequestButton";
import { UnlockContactButton } from "@/components/payment/UnlockContactButton";

export const metadata = {
  title: "My Tutor Requests — Tutr Balasore",
  description: "View and manage your tuition requests to verified Balasore educators.",
};

export default async function StudentRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/student/requests");
  }

  // Fetch student's submitted requests strictly filtered by database RLS
  const { data: rawRequests, error } = await supabase
    .from("tutor_requests")
    .select(
      `
      id,
      status,
      message,
      created_at,
      responded_at,
      tutor:tutor_profiles(id, display_name, locality, fee),
      subject:subjects(id, name),
      class:classes(id, name),
      connection:tutor_connections(id, status, amount, currency)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching student requests:", error);
  }

  const requests = rawRequests || [];

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
              Student Requests
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tutors"
              className="text-xs font-bold text-ink hover:text-warm-coral px-3 py-1.5 rounded-full border-2 border-ink bg-white shadow-[2px_2px_0px_#18121E] transition-colors"
            >
              Find Tutors
            </Link>
            <Link
              href="/student"
              className="text-xs font-bold text-ink/70 hover:text-ink px-3 py-1.5 rounded-full hover:bg-white/60 transition-colors"
            >
              Student Portal
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
                Student
              </Link>
              <span>/</span>
              <span className="text-ink font-black">Requests</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              My Tutor Requests
            </h1>
            <p className="text-xs text-ink/70 font-medium mt-1">
              Track the status of your tuition inquiries to Balasore tutors.
            </p>
          </div>

          <Link
            href="/tutors"
            className="tutr-btn-student py-2.5 px-5 text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <span>Browse More Tutors</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="tutr-card bg-white p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-honey/20 border-2 border-ink text-ink flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#18121E]">
              <Calendar className="w-8 h-8 text-warm-coral" />
            </div>
            <h2 className="text-xl font-black text-ink mb-2">
              No tutor requests yet.
            </h2>
            <p className="text-xs text-ink/70 mb-6 leading-relaxed font-medium">
              You haven&apos;t contacted any tutors yet. Explore verified educators across Balasore and send your first tuition request.
            </p>
            <Link
              href="/tutors"
              className="tutr-btn-student py-3 px-6 text-xs inline-flex items-center gap-2"
            >
              <span>Browse Verified Tutors</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const formattedDate = new Date(req.created_at).toLocaleDateString(
                "en-IN",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }
              );

              // Status badge configuration
              let statusBadge = (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-honey/30 text-ink border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pending</span>
                </span>
              );

              if (req.status === "ACCEPTED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mint-badge/40 text-ink border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Accepted</span>
                  </span>
                );
              } else if (req.status === "DECLINED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warm-coral/30 text-ink border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                    <XCircle className="w-3.5 h-3.5 text-rose-700" />
                    <span>Declined</span>
                  </span>
                );
              } else if (req.status === "CANCELLED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-ink/70 border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                    <Slash className="w-3.5 h-3.5 text-gray-500" />
                    <span>Cancelled</span>
                  </span>
                );
              }

              return (
                <div
                  key={req.id}
                  className="tutr-card bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black text-ink">
                        {req.tutor?.id ? (
                          <Link
                            href={`/tutors/${req.tutor.id}`}
                            className="hover:text-warm-coral transition-colors"
                          >
                            {req.tutor.display_name}
                          </Link>
                        ) : (
                          req.tutor?.display_name || "Tutor"
                        )}
                      </h3>
                      {statusBadge}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/70 font-medium">
                      {req.tutor?.locality && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-warm-coral" />
                          <span>{req.tutor.locality}</span>
                        </div>
                      )}

                      {req.subject?.name && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-warm-coral" />
                          <span>{req.subject.name}</span>
                        </div>
                      )}

                      {req.class?.name && (
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-warm-coral" />
                          <span>{req.class.name}</span>
                        </div>
                      )}

                      {req.tutor?.fee && (
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5 text-warm-coral" />
                          <span>{req.tutor.fee}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-ink/50">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Requested on {formattedDate}</span>
                      </div>
                    </div>

                    {req.message && (
                      <p className="text-xs text-ink bg-canvas-lavender p-2.5 rounded-xl border border-ink/30 italic">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}
                    {req.status === "ACCEPTED" && (
                      <div className="mt-2 p-3.5 rounded-2xl bg-mint-badge/20 border-2 border-ink text-xs space-y-1 shadow-[2px_2px_0px_#18121E]">
                        <div className="flex items-center gap-1.5 font-black text-ink">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                          <span>Your request has been accepted by this educator!</span>
                        </div>
                        {req.connection && (
                          <div className="text-[11px] text-ink/80 font-medium flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                            <span>Connection Fee: <strong className="text-ink">₹{req.connection.amount}</strong></span>
                            <span>•</span>
                            <Link
                              href={`/student/connections/${req.connection.id}`}
                              className="text-ink font-bold underline hover:text-warm-coral"
                            >
                              View Connection Details &rarr;
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 self-end sm:self-center">
                    {req.status === "PENDING" && (
                      <CancelRequestButton requestId={req.id} />
                    )}

                    {req.status === "ACCEPTED" && req.connection && (
                      req.connection.status === "CONTACT_UNLOCKED" ? (
                        <Link
                          href={`/student/connections/${req.connection.id}`}
                          className="px-4 py-2 rounded-full border-2 border-ink bg-mint-badge font-bold text-ink text-xs shadow-[2px_2px_0px_#18121E] hover:bg-mint-badge/80 transition-colors"
                        >
                          View Unlocked Contact
                        </Link>
                      ) : (
                        <UnlockContactButton
                          connectionId={req.connection.id}
                          amount={Number(req.connection.amount)}
                          currency={req.connection.currency}
                          tutorName={req.tutor?.display_name || "Tutor"}
                          isUnlocked={false}
                        />
                      )
                    )}

                    {req.tutor?.id && (
                      <Link
                        href={`/tutors/${req.tutor.id}`}
                        className="px-3.5 py-1.5 rounded-full border-2 border-ink bg-white text-xs font-bold text-ink hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_#18121E]"
                      >
                        View Profile
                      </Link>
                    )}
                  </div>
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
