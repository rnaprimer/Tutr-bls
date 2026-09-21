import React from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  User,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  Calendar,
  DollarSign,
  FileText,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Layers,
  Award,
  CreditCard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { SignOutButton } from "@/components/SignOutButton";
import { ApplicationReviewActions } from "./ApplicationReviewActions";
import { TutrLogo } from "@/components/TutrIllustrations";

export const metadata = {
  title: "Tutor Application Dossier — Tutr Admin",
  description: "Review applicant qualifications, experience, and documents.",
};

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;
  const { isAuthenticated, isAdmin, user, profile } = await verifyAdminSession();

  if (!isAuthenticated) {
    redirect(`/login?next=/admin/applications/${id}`);
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender/40 font-sans">
        <header className="w-full bg-white border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <TutrLogo className="w-8 h-8" />
              <span className="font-extrabold text-2xl tracking-tight text-ink">Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-warm-coral/15 text-ink border border-ink">
                <MapPin className="w-3 h-3 text-warm-coral" />
                Balasore
              </span>
            </Link>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-3xl border-2 border-ink p-8 shadow-[4px_4px_0px_#18121E] text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-ink flex items-center justify-center text-rose-600 mx-auto mb-6 shadow-[2px_2px_0px_#18121E]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-ink mb-2">Access Denied</h1>
            <p className="text-xs text-ink/70 mb-6 leading-relaxed">
              You are signed in as <strong>{user?.email}</strong>, but this account does not have administrator privileges to view tutor applications.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border-2 border-ink hover:bg-canvas-lavender text-ink font-bold text-xs shadow-[2px_2px_0px_#18121E] transition-transform active:translate-y-0.5"
            >
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const supabase = await createClient();

  // Fetch application record governed by RLS
  const { data: application, error } = await supabase
    .from("tutor_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !application) {
    notFound();
  }

  // Fetch onboarding payment record if available
  const { data: onboardingPayments } = await supabase
    .from("tutor_onboarding_payments")
    .select("id, amount, currency, status, razorpay_order_id, razorpay_payment_id, paid_at, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  const activePayment =
    onboardingPayments?.find((p) => p.status === "PAID") ||
    onboardingPayments?.[0] ||
    null;
  const onboardingStatus = activePayment?.status || "UNPAID";

  // Fetch reviewer details if reviewed_by is populated
  let reviewerName: string | null = null;
  let reviewerEmail: string | null = null;
  if (application.reviewed_by) {
    const { data: reviewerUser } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", application.reviewed_by)
      .single();

    if (reviewerUser) {
      reviewerName = reviewerUser.full_name;
      reviewerEmail = reviewerUser.email;
    }
  }

  // Format arrays safely
  const subjects: string[] = Array.isArray(application.subjects)
    ? (application.subjects as string[])
    : [];
  const classes: string[] = Array.isArray(application.classes)
    ? (application.classes as string[])
    : [];
  const boards: string[] = Array.isArray(application.boards)
    ? (application.boards as string[])
    : [];
  const documents: string[] = Array.isArray(application.documents)
    ? (application.documents as string[])
    : [];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender/30 font-sans">
      {/* Top Admin Header */}
      <header className="w-full bg-white border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/applications"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink hover:bg-canvas-lavender transition-all px-3 py-1.5 rounded-full border-2 border-ink shadow-[2px_2px_0px_#18121E]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Queue</span>
            </Link>

            <span className="hidden sm:inline-block text-xs font-mono text-ink/40">/</span>

            <span className="hidden sm:inline-block text-xs font-bold text-ink/80 truncate max-w-xs">
              {application.full_name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-ink/70">
              <User className="w-3.5 h-3.5 text-warm-coral" />
              <span>{profile?.full_name || user?.email}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Title & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-ink p-6 sm:p-8 shadow-[4px_4px_0px_#18121E]">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink bg-soft-purple/40 border border-ink px-3 py-1 rounded-full mb-3">
              <GraduationCap className="w-3.5 h-3.5 text-warm-coral" />
              Tutor Application Dossier
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              {application.full_name}
            </h1>
            <p className="text-xs text-ink/70 mt-1 flex items-center gap-2 flex-wrap">
              <span>Submitted: {new Date(application.submitted_at).toLocaleString("en-IN")}</span>
              <span>•</span>
              <span className="font-mono">ID: {application.id}</span>
              {application.google_response_id && (
                <>
                  <span>•</span>
                  <span className="font-mono">Google ID: {application.google_response_id}</span>
                </>
              )}
            </p>
          </div>

          <div>
            {application.status === "PENDING" && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-warm-honey text-ink border-2 border-ink shadow-[2px_2px_0px_#18121E]">
                <Clock className="w-4 h-4" />
                STATUS: PENDING
              </span>
            )}
            {application.status === "UNDER_REVIEW" && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-soft-purple text-ink border-2 border-ink shadow-[2px_2px_0px_#18121E]">
                <ShieldAlert className="w-4 h-4 text-purple-800" />
                STATUS: UNDER REVIEW
              </span>
            )}
            {application.status === "APPROVED" && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-mint text-ink border-2 border-ink shadow-[2px_2px_0px_#18121E]">
                <ShieldCheck className="w-4 h-4 text-emerald-800" />
                STATUS: APPROVED
              </span>
            )}
            {application.status === "REJECTED" && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-rose-400 text-white border-2 border-ink shadow-[2px_2px_0px_#18121E]">
                <ShieldAlert className="w-4 h-4" />
                STATUS: REJECTED
              </span>
            )}
          </div>
        </div>

        {/* Highlight Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border-2 border-ink p-4 shadow-[2px_2px_0px_#18121E]">
            <div className="flex items-center gap-2 text-xs font-bold text-ink/60 mb-1">
              <MapPin className="w-3.5 h-3.5 text-warm-coral" />
              <span>Locality</span>
            </div>
            <p className="text-sm font-black text-ink truncate">
              {application.location || "Not specified"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-ink p-4 shadow-[2px_2px_0px_#18121E]">
            <div className="flex items-center gap-2 text-xs font-bold text-ink/60 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-warm-coral" />
              <span>Expected Fee</span>
            </div>
            <p className="text-sm font-black text-ink truncate">
              {application.fee || "Not specified"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-ink p-4 shadow-[2px_2px_0px_#18121E]">
            <div className="flex items-center gap-2 text-xs font-bold text-ink/60 mb-1">
              <Calendar className="w-3.5 h-3.5 text-warm-coral" />
              <span>Availability</span>
            </div>
            <p className="text-sm font-black text-ink truncate">
              {application.availability || "Flexible"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-ink p-4 shadow-[2px_2px_0px_#18121E]">
            <div className="flex items-center gap-2 text-xs font-bold text-ink/60 mb-1">
              <Award className="w-3.5 h-3.5 text-warm-coral" />
              <span>Documents</span>
            </div>
            <p className="text-sm font-black text-ink truncate">
              {documents.length} Uploaded
            </p>
          </div>
        </div>

        {/* Workflow Actions Module */}
        <ApplicationReviewActions
          applicationId={application.id}
          status={application.status}
          userId={application.user_id}
          rejectionReason={application.rejection_reason}
        />

        {/* Onboarding Fee & Payment Details (for APPROVED applications) */}
        {application.status === "APPROVED" && (
          <div className="bg-white rounded-3xl border-2 border-ink p-6 shadow-[3px_3px_0px_#18121E] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-warm-coral" />
                Tutor Onboarding Fee
              </h3>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-ink ${
                  onboardingStatus === "PAID"
                    ? "bg-mint text-ink"
                    : onboardingStatus === "PENDING"
                    ? "bg-soft-purple text-ink"
                    : "bg-warm-honey text-ink"
                }`}
              >
                {onboardingStatus === "PAID" && <ShieldCheck className="w-3.5 h-3.5" />}
                {onboardingStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-canvas-lavender/40 border border-ink">
                <span className="text-ink/60 block mb-1 font-medium">Application</span>
                <span className="font-extrabold text-ink">APPROVED</span>
              </div>

              <div className="p-3 rounded-2xl bg-canvas-lavender/40 border border-ink">
                <span className="text-ink/60 block mb-1 font-medium">Fee Amount</span>
                <span className="font-extrabold text-ink">
                  ₹{activePayment?.amount || 149} {activePayment?.currency || "INR"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-canvas-lavender/40 border border-ink">
                <span className="text-ink/60 block mb-1 font-medium">Razorpay Order ID</span>
                <span className="font-mono text-ink font-bold truncate block">
                  {activePayment?.razorpay_order_id || "—"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-canvas-lavender/40 border border-ink">
                <span className="text-ink/60 block mb-1 font-medium">Razorpay Payment ID</span>
                <span className="font-mono text-ink font-bold truncate block">
                  {activePayment?.razorpay_payment_id || "—"}
                </span>
              </div>
            </div>

            {activePayment?.paid_at && (
              <div className="mt-3 pt-3 border-t-2 border-ink/10 text-xs text-ink/70 flex items-center justify-between font-medium">
                <span>Paid At:</span>
                <span className="font-mono font-bold text-ink">
                  {new Date(activePayment.paid_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Two-Column Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Applicant & Teaching Details */}
          <div className="space-y-6">
            {/* Contact Details */}
            <div className="bg-white rounded-3xl border-2 border-ink p-6 shadow-[3px_3px_0px_#18121E]">
              <h3 className="text-base font-extrabold text-ink mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-warm-coral" />
                Applicant Identity & Contact
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-ink/10">
                  <span className="text-ink/70 font-medium">Full Name</span>
                  <span className="font-bold text-ink">{application.full_name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-ink/10">
                  <span className="text-ink/70 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-warm-coral" />
                    Email
                  </span>
                  <span className="font-bold text-ink">{application.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-ink/10">
                  <span className="text-ink/70 font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-warm-coral" />
                    Phone
                  </span>
                  <span className="font-bold text-ink">{application.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-ink/10">
                  <span className="text-ink/70 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-warm-coral" />
                    Preferred Locality
                  </span>
                  <span className="font-bold text-ink">{application.location || "Not provided"}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-ink/70 font-medium">Registered User ID</span>
                  <span className="font-mono font-bold text-ink">
                    {application.user_id ? application.user_id : "(Pending registration)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Teaching Subjects, Classes & Boards */}
            <div className="bg-white rounded-3xl border-2 border-ink p-6 shadow-[3px_3px_0px_#18121E]">
              <h3 className="text-base font-extrabold text-ink mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-warm-coral" />
                Teaching Capabilities
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-2">
                    Subjects Taught ({subjects.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.length > 0 ? (
                      subjects.map((sub, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md text-xs font-bold bg-canvas-lavender text-ink border border-ink"
                        >
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink/40 italic">None specified</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-2">
                    Classes Handled ({classes.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {classes.length > 0 ? (
                      classes.map((cls, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md text-xs font-bold bg-soft-purple/40 text-ink border border-ink"
                        >
                          {cls}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink/40 italic">None specified</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-2">
                    Target Boards ({boards.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {boards.length > 0 ? (
                      boards.map((brd, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md text-xs font-bold bg-cream text-ink border border-ink"
                        >
                          {brd}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-ink/40 italic">None specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Qualifications, Documents & Audit Log */}
          <div className="space-y-6">
            {/* Qualification & Background */}
            <div className="bg-white rounded-3xl border-2 border-ink p-6 shadow-[3px_3px_0px_#18121E]">
              <h3 className="text-base font-extrabold text-ink mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-warm-coral" />
                Qualification & Background
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="font-bold text-ink block mb-1">Educational Qualification</span>
                  <div className="p-3 bg-canvas-lavender/30 rounded-2xl border border-ink text-ink leading-relaxed font-medium">
                    {application.qualification || "No qualification details provided."}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-ink block mb-1">Teaching Experience</span>
                  <div className="p-3 bg-canvas-lavender/30 rounded-2xl border border-ink text-ink leading-relaxed font-medium">
                    {application.experience || "No experience summary provided."}
                  </div>
                </div>
              </div>
            </div>

            {/* Document References */}
            <div className="bg-white rounded-3xl border-2 border-ink p-6 shadow-[3px_3px_0px_#18121E]">
              <h3 className="text-base font-extrabold text-ink mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-warm-coral" />
                Uploaded Documents & Credentials
              </h3>
              <p className="text-xs text-ink/70 mb-4">
                Secure Administrator View: Document URLs are accessible only by verified admins and never exposed to the public marketplace.
              </p>

              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((docUrl, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-canvas-lavender/40 border border-ink"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FileText className="w-4 h-4 text-warm-coral flex-shrink-0" />
                        <span className="text-xs font-mono font-bold text-ink truncate max-w-xs sm:max-w-md">
                          {docUrl}
                        </span>
                      </div>
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-ink hover:bg-canvas-lavender px-3 py-1 rounded-full border border-ink transition-colors flex-shrink-0 bg-white"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-canvas-lavender/30 border border-ink text-center text-xs font-medium text-ink/50">
                  No document links attached to this submission.
                </div>
              )}
            </div>

            {/* Review Audit History */}
            <div className="bg-white rounded-3xl border-2 border-ink p-6 shadow-[3px_3px_0px_#18121E]">
              <h3 className="text-base font-extrabold text-ink mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-warm-coral" />
                Review Audit Trail
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-ink/10">
                  <span className="text-ink/70 font-medium">Reviewed At</span>
                  <span className="font-bold text-ink">
                    {application.reviewed_at
                      ? new Date(application.reviewed_at).toLocaleString("en-IN")
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-ink/10">
                  <span className="text-ink/70 font-medium">Reviewed By</span>
                  <span className="font-bold text-ink">
                    {reviewerName
                      ? `${reviewerName} (${reviewerEmail})`
                      : application.reviewed_by || "—"}
                  </span>
                </div>

                {application.rejection_reason && (
                  <div className="py-2">
                    <span className="font-bold text-rose-900 block mb-1">Rejection Reason</span>
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-300 text-rose-950 font-medium">
                      {application.rejection_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs font-medium text-ink/60 border-t-2 border-ink bg-white">
        <p>© {new Date().getFullYear()} Tutr Balasore • Administrative Application Management</p>
      </footer>
    </div>
  );
}
