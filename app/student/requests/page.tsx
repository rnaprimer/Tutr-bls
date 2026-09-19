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
              Student Requests
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tutors"
              className="text-xs font-semibold text-teal-dark hover:text-navy px-3 py-1.5 rounded-full border border-teal/30 hover:bg-beige/60 transition-colors"
            >
              Find Tutors
            </Link>
            <Link
              href="/student"
              className="text-xs font-semibold text-navy/70 hover:text-navy px-3 py-1.5 rounded-full hover:bg-beige/60 transition-colors"
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
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy/60 mb-1">
              <Link href="/student" className="hover:text-navy">
                Student
              </Link>
              <span>/</span>
              <span className="text-navy font-bold">Requests</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              My Tutor Requests
            </h1>
            <p className="text-xs text-navy/60 mt-1">
              Track the status of your tuition applications to Balasore tutors.
            </p>
          </div>

          <Link
            href="/tutors"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-colors shadow-sm self-start sm:self-auto"
          >
            <span>Browse More Tutors</span>
            <ArrowRight className="w-3.5 h-3.5 text-teal" />
          </Link>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-navy/10 p-8 sm:p-12 text-center shadow-sm max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-sky/30 text-teal flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-navy mb-2">
              No tutor requests yet.
            </h2>
            <p className="text-xs text-navy/60 mb-6 leading-relaxed">
              You haven&apos;t contacted any tutors yet. Explore verified educators across Balasore and send your first tuition request.
            </p>
            <Link
              href="/tutors"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-all shadow-sm"
            >
              <span>Browse Verified Tutors</span>
              <ArrowRight className="w-4 h-4 text-teal" />
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pending</span>
                </span>
              );

              if (req.status === "ACCEPTED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Accepted</span>
                  </span>
                );
              } else if (req.status === "DECLINED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5 text-rose-700" />
                    <span>Declined</span>
                  </span>
                );
              } else if (req.status === "CANCELLED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                    <Slash className="w-3.5 h-3.5 text-gray-500" />
                    <span>Cancelled</span>
                  </span>
                );
              }

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-navy/10 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-navy">
                        {req.tutor?.id ? (
                          <Link
                            href={`/tutors/${req.tutor.id}`}
                            className="hover:text-teal transition-colors"
                          >
                            {req.tutor.display_name}
                          </Link>
                        ) : (
                          req.tutor?.display_name || "Tutor"
                        )}
                      </h3>
                      {statusBadge}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy/70">
                      {req.tutor?.locality && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-teal" />
                          <span>{req.tutor.locality}</span>
                        </div>
                      )}

                      {req.subject?.name && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-teal" />
                          <span>{req.subject.name}</span>
                        </div>
                      )}

                      {req.class?.name && (
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-teal" />
                          <span>{req.class.name}</span>
                        </div>
                      )}

                      {req.tutor?.fee && (
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5 text-teal" />
                          <span>{req.tutor.fee}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-navy/50">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Requested on {formattedDate}</span>
                      </div>
                    </div>

                    {req.message && (
                      <p className="text-xs text-navy/80 bg-beige-light/70 p-2.5 rounded-xl border border-navy/5 italic">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}
                    {req.status === "ACCEPTED" && (
                      <div className="mt-2 p-3 rounded-xl bg-sky/20 border border-sky/30 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-navy">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                          <span>Your request has been accepted by this educator.</span>
                        </div>
                        {req.connection && (
                          <div className="text-[11px] text-navy/70 flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                            <span>Connection Fee: <strong className="text-emerald-700">₹{req.connection.amount}</strong></span>
                            <span>•</span>
                            <Link
                              href={`/student/connections/${req.connection.id}`}
                              className="text-teal font-semibold hover:underline"
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
                          className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
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
                        className="px-3.5 py-1.5 rounded-full border border-navy/15 text-xs font-semibold text-navy hover:bg-beige/60 transition-colors"
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
      <footer className="text-center py-6 text-xs text-navy/50 border-t border-navy/10 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
