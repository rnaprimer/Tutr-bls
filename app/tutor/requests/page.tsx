import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Slash,
  BookOpen,
  GraduationCap,
  Calendar,
  ArrowLeft,
  ShieldCheck,
  Inbox,
  User,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignOutButton } from "@/components/SignOutButton";
import { TutorRequestActions } from "./TutorRequestActions";
import { UnlockedContactsResponse } from "@/lib/razorpay/client";

export const metadata = {
  title: "Tutor Requests — Tutr Balasore",
  description: "Manage incoming tuition requests from Balasore students.",
};

export default async function TutorRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/tutor/requests");
  }

  // Fetch tutor profile to ensure user is a verified tutor
  const { data: tutorProfile } = await supabase
    .from("tutor_profiles")
    .select("id, display_name, is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  // If user is not yet a verified tutor, guide them back to the tutor portal status vie  // If user is not yet a verified tutor, guide them back to the tutor portal status view
  if (!tutorProfile || !tutorProfile.is_verified) {
    return (
      <div className="min-h-screen bg-canvas-lavender flex items-center justify-center p-4">
        <div className="max-w-md w-full tutr-card bg-white p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-honey/20 border-2 border-ink text-ink flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#18121E]">
            <AlertTriangle className="w-7 h-7 text-amber-700" />
          </div>
          <h2 className="text-xl font-black text-ink mb-2">
            Verified Tutor Access Required
          </h2>
          <p className="text-xs text-ink/70 font-medium mb-6 leading-relaxed">
            Only approved and verified tutors can view student tuition requests. Please check your application status in the tutor portal.
          </p>
          <Link
            href="/tutor"
            className="tutr-btn-tutor py-2.5 px-6 text-xs inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Tutor Portal</span>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch incoming requests strictly scoped to this verified tutor's profile id.
  // PRIVACY BOUNDARY: We strictly request only the student's display name.
  // Phone numbers, emails, and personal contact info are NEVER selected in raw queries.
  const adminClient = createAdminClient();
  const { data: rawRequests, error } = await adminClient
    .from("tutor_requests")
    .select(
      `
      id,
      status,
      message,
      created_at,
      responded_at,
      student:students(
        id,
        user:users(
          full_name
        )
      ),
      subject:subjects(id, name),
      class:classes(id, name),
      connection:tutor_connections(
        id,
        status,
        payment_status,
        paid_at,
        contact_unlocked_at
      )
    `
    )
    .eq("tutor_id", tutorProfile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching incoming requests:", error);
  }

  const rawList = rawRequests || [];

  // For unlocked connections, fetch permitted student contacts via secure RPC
  const requests = await Promise.all(
    rawList.map(async (req) => {
      let unlockedStudent = null;
      if (req.status === "ACCEPTED" && req.connection?.status === "CONTACT_UNLOCKED") {
        const { data: contactData } = await adminClient.rpc(
          "get_unlocked_connection_contacts",
          { p_connection_id: req.connection.id }
        );
        const contacts = contactData as unknown as UnlockedContactsResponse;
        unlockedStudent = contacts?.student || null;
      }
      return { ...req, unlockedStudent };
    })
  );

  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender">
      {/* Top Navigation */}
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
              Tutor Dashboard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tutor"
              className="text-xs font-bold text-ink/70 hover:text-ink px-3.5 py-1.5 rounded-full hover:bg-white/60 transition-colors"
            >
              My Application
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/60 mb-1">
              <Link href="/tutor" className="hover:text-warm-coral">
                Tutor Portal
              </Link>
              <span>/</span>
              <span className="text-ink font-black">Requests</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              Tutor Requests
            </h1>
            <p className="text-xs text-ink/70 font-medium mt-1">
              Welcome, <span className="font-bold text-ink">{tutorProfile.display_name}</span>. Review and respond to student inquiries.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-mint-badge text-ink border-2 border-ink shadow-[2px_2px_0px_#18121E] self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
            <span>Verified Tutor</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-8">
          <div className="tutr-card bg-white p-5">
            <span className="text-xs font-black uppercase tracking-wider text-ink/60 block mb-1">
              Pending Requests
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-amber-700">
                {pendingRequests.length}
              </span>
              <span className="text-xs text-ink/50 font-medium">waiting for response</span>
            </div>
          </div>

          <div className="tutr-card bg-white p-5">
            <span className="text-xs font-black uppercase tracking-wider text-ink/60 block mb-1">
              Total Requests
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-ink">
                {requests.length}
              </span>
              <span className="text-xs text-ink/50 font-medium">all-time received</span>
            </div>
          </div>
        </div>

        {/* Requests Queue */}
        {requests.length === 0 ? (
          <div className="tutr-card bg-white p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-purple-accent/20 border-2 border-ink text-ink flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#18121E]">
              <Inbox className="w-8 h-8 text-warm-coral" />
            </div>
            <h2 className="text-xl font-black text-ink mb-2">
              No student requests yet.
            </h2>
            <p className="text-xs text-ink/70 leading-relaxed font-medium">
              Your profile is live on the Balasore verified tutor directory. When students request tutoring for your subjects, their inquiries will appear here.
            </p>
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

              // Privacy check: Student name resolution only
              // NEVER display email or phone
              const studentName =
                req.student?.user?.full_name || "Student";

              let statusBadge = (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-honey/30 text-ink border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>PENDING</span>
                </span>
              );

              if (req.status === "ACCEPTED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-mint-badge/40 text-ink border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                    <span>ACCEPTED</span>
                  </span>
                );
              } else if (req.status === "DECLINED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warm-coral/30 text-ink border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                    <XCircle className="w-3.5 h-3.5 text-rose-700" />
                    <span>DECLINED</span>
                  </span>
                );
              } else if (req.status === "CANCELLED") {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-ink/70 border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                    <Slash className="w-3.5 h-3.5 text-gray-500" />
                    <span>CANCELLED</span>
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
                      <div className="flex items-center gap-2 font-black text-ink text-base">
                        <User className="w-4 h-4 text-warm-coral" />
                        <span>Student: {studentName}</span>
                      </div>
                      {statusBadge}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/70 font-medium">
                      {req.subject?.name && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-warm-coral" />
                          <span>Subject: {req.subject.name}</span>
                        </div>
                      )}

                      {req.class?.name && (
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-warm-coral" />
                          <span>Class: {req.class.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-ink/50">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Requested: {formattedDate}</span>
                      </div>
                    </div>

                    {req.message && (
                      <div className="p-3 rounded-xl bg-canvas-lavender border border-ink/20 text-xs text-ink">
                        <span className="text-[10px] font-black uppercase tracking-wider text-ink/50 block mb-0.5">
                          Student Note
                        </span>
                        <p className="font-medium">&ldquo;{req.message}&rdquo;</p>
                      </div>
                    )}

                    {/* Phase 6 Connection Status for ACCEPTED Requests */}
                    {req.status === "ACCEPTED" && (
                      <div className="mt-3 p-3.5 rounded-2xl border-2 border-ink text-xs space-y-2 bg-mint-badge/20 shadow-[2px_2px_0px_#18121E]">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-ink">Request Accepted</span>
                          {req.connection?.status === "CONTACT_UNLOCKED" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink bg-mint-badge/40 px-2.5 py-0.5 rounded-full border border-ink shadow-[1px_1px_0px_#18121E]">
                              <ShieldCheck className="w-3 h-3 text-emerald-800" />
                              Contact Unlocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink bg-honey/30 px-2.5 py-0.5 rounded-full border border-ink shadow-[1px_1px_0px_#18121E]">
                              <Clock className="w-3 h-3 text-amber-700" />
                              Waiting for student payment
                            </span>
                          )}
                        </div>

                        {req.connection?.status === "CONTACT_UNLOCKED" && req.unlockedStudent ? (
                          <div className="p-3 bg-white rounded-xl border-2 border-ink space-y-2 mt-1 shadow-[1px_1px_0px_#18121E]">
                            <div className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                              Student Contact Information
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {req.unlockedStudent.email && (
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-ink/50 block">Email Address</span>
                                  <a
                                    href={`mailto:${req.unlockedStudent.email}`}
                                    className="font-bold text-ink hover:text-warm-coral underline"
                                  >
                                    {req.unlockedStudent.email}
                                  </a>
                                </div>
                              )}
                              <div>
                                <span className="text-[10px] uppercase font-bold text-ink/50 block">Phone Number</span>
                                {req.unlockedStudent.phone ? (
                                  <a
                                    href={`tel:${req.unlockedStudent.phone}`}
                                    className="font-bold text-ink hover:text-warm-coral underline"
                                  >
                                    {req.unlockedStudent.phone}
                                  </a>
                                ) : (
                                  <span className="text-ink/50 italic">Not provided</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-ink/70 font-medium">
                            The student has been notified. Once they complete the contact unlock fee, their direct contact details will be revealed here.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions for PENDING requests */}
                  <div className="self-end sm:self-center">
                    {req.status === "PENDING" ? (
                      <TutorRequestActions
                        requestId={req.id}
                        studentName={studentName}
                      />
                    ) : (
                      <div className="text-right text-[11px] text-ink/50 font-bold">
                        {req.responded_at ? (
                          <span>
                            Responded on{" "}
                            {new Date(req.responded_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        ) : (
                          <span>Closed</span>
                        )}
                      </div>
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
