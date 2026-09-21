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
      <div className="min-h-screen flex flex-col justify-between bg-beige-light/40">
        <header className="w-full bg-white/95 border-b border-navy/10 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy">
              <span>Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase px-2 py-0.5 rounded-full bg-sky/50 text-navy border border-sky">
                <MapPin className="w-3 h-3 text-teal" />
                Balasore
              </span>
            </Link>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-3xl border border-red-200 p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto mb-6">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2">Access Denied</h1>
            <p className="text-xs text-navy/70 mb-6 leading-relaxed">
              You are signed in as <strong>{user?.email}</strong>, but this account does not have administrator privileges to view tutor applications.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-medium text-xs transition-colors"
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
    <div className="min-h-screen flex flex-col justify-between bg-beige-light/40">
      {/* Top Admin Header */}
      <header className="w-full bg-white/95 border-b border-navy/10 px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-40 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/applications"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy/70 hover:text-navy transition-colors px-3 py-1.5 rounded-full hover:bg-beige/60 border border-navy/10"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-teal" />
              <span>Back to Queue</span>
            </Link>

            <span className="hidden sm:inline-block text-xs font-mono text-navy/40">/</span>

            <span className="hidden sm:inline-block text-xs font-medium text-navy/70 truncate max-w-xs">
              {application.full_name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-navy/70">
              <User className="w-3.5 h-3.5 text-teal" />
              <span>{profile?.full_name || user?.email}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Title & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border border-navy/10 p-6 sm:p-8 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-teal bg-sky/30 px-3 py-1 rounded-full mb-3">
              <GraduationCap className="w-3.5 h-3.5" />
              Tutor Application Dossier
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              {application.full_name}
            </h1>
            <p className="text-xs text-navy/60 mt-1 flex items-center gap-2 flex-wrap">
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
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                <Clock className="w-4 h-4" />
                STATUS: PENDING
              </span>
            )}
            {application.status === "UNDER_REVIEW" && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-sky-50 text-sky-900 border border-sky-200">
                <ShieldAlert className="w-4 h-4 text-sky-600" />
                STATUS: UNDER REVIEW
              </span>
            )}
            {application.status === "APPROVED" && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                STATUS: APPROVED
              </span>
            )}
            {application.status === "REJECTED" && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-rose-50 text-rose-900 border border-rose-200">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                STATUS: REJECTED
              </span>
            )}
          </div>
        </div>

        {/* Highlight Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-navy/10 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-navy/60 mb-1">
              <MapPin className="w-3.5 h-3.5 text-teal" />
              <span>Locality</span>
            </div>
            <p className="text-sm font-bold text-navy truncate">
              {application.location || "Not specified"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-navy/10 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-navy/60 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-teal" />
              <span>Expected Fee</span>
            </div>
            <p className="text-sm font-bold text-navy truncate">
              {application.fee || "Not specified"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-navy/10 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-navy/60 mb-1">
              <Calendar className="w-3.5 h-3.5 text-teal" />
              <span>Availability</span>
            </div>
            <p className="text-sm font-bold text-navy truncate">
              {application.availability || "Flexible"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-navy/10 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-navy/60 mb-1">
              <Award className="w-3.5 h-3.5 text-teal" />
              <span>Documents</span>
            </div>
            <p className="text-sm font-bold text-navy truncate">
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
          <div className="bg-white rounded-3xl border border-navy/10 p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal" />
                Tutor Onboarding Fee
              </h3>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  onboardingStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : onboardingStatus === "PENDING"
                    ? "bg-sky-100 text-sky-800 border border-sky-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {onboardingStatus === "PAID" && <ShieldCheck className="w-3.5 h-3.5" />}
                {onboardingStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-2xl bg-beige-light/60 border border-navy/5">
                <span className="text-navy/60 block mb-1">Application</span>
                <span className="font-bold text-navy">APPROVED</span>
              </div>

              <div className="p-3 rounded-2xl bg-beige-light/60 border border-navy/5">
                <span className="text-navy/60 block mb-1">Fee Amount</span>
                <span className="font-bold text-navy">
                  ₹{activePayment?.amount || 149} {activePayment?.currency || "INR"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-beige-light/60 border border-navy/5">
                <span className="text-navy/60 block mb-1">Razorpay Order ID</span>
                <span className="font-mono text-navy font-semibold truncate block">
                  {activePayment?.razorpay_order_id || "—"}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-beige-light/60 border border-navy/5">
                <span className="text-navy/60 block mb-1">Razorpay Payment ID</span>
                <span className="font-mono text-navy font-semibold truncate block">
                  {activePayment?.razorpay_payment_id || "—"}
                </span>
              </div>
            </div>

            {activePayment?.paid_at && (
              <div className="mt-3 pt-3 border-t border-navy/5 text-xs text-navy/70 flex items-center justify-between">
                <span>Paid At:</span>
                <span className="font-mono font-medium text-navy">
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
            <div className="bg-white rounded-3xl border border-navy/10 p-6 shadow-sm">
              <h3 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-teal" />
                Applicant Identity & Contact
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-navy/5">
                  <span className="text-navy/60">Full Name</span>
                  <span className="font-semibold text-navy">{application.full_name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-navy/5">
                  <span className="text-navy/60 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-teal" />
                    Email
                  </span>
                  <span className="font-semibold text-navy">{application.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-navy/5">
                  <span className="text-navy/60 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal" />
                    Phone
                  </span>
                  <span className="font-semibold text-navy">{application.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-navy/5">
                  <span className="text-navy/60 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal" />
                    Preferred Locality
                  </span>
                  <span className="font-semibold text-navy">{application.location || "Not provided"}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-navy/60">Registered User ID</span>
                  <span className="font-mono text-navy">
                    {application.user_id ? application.user_id : "(Pending registration)"}
                  </span>
                </div>
              </div>
            </div>

            {/* Teaching Subjects, Classes & Boards */}
            <div className="bg-white rounded-3xl border border-navy/10 p-6 shadow-sm">
              <h3 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal" />
                Teaching Capabilities
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-navy/70 mb-2">
                    Subjects Taught ({subjects.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {subjects.length > 0 ? (
                      subjects.map((sub, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal-dark border border-teal/20"
                        >
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-navy/40 italic">None specified</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy/70 mb-2">
                    Classes Handled ({classes.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {classes.length > 0 ? (
                      classes.map((cls, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-sky/40 text-navy border border-sky"
                        >
                          {cls}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-navy/40 italic">None specified</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy/70 mb-2">
                    Target Boards ({boards.length})
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {boards.length > 0 ? (
                      boards.map((brd, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-beige text-navy border border-navy/10"
                        >
                          {brd}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-navy/40 italic">None specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Qualifications, Documents & Audit Log */}
          <div className="space-y-6">
            {/* Qualification & Background */}
            <div className="bg-white rounded-3xl border border-navy/10 p-6 shadow-sm">
              <h3 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-teal" />
                Qualification & Background
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="font-semibold text-navy block mb-1">Educational Qualification</span>
                  <div className="p-3 bg-beige-light/70 rounded-2xl border border-navy/10 text-navy leading-relaxed">
                    {application.qualification || "No qualification details provided."}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-navy block mb-1">Teaching Experience</span>
                  <div className="p-3 bg-beige-light/70 rounded-2xl border border-navy/10 text-navy leading-relaxed">
                    {application.experience || "No experience summary provided."}
                  </div>
                </div>
              </div>
            </div>

            {/* Document References */}
            <div className="bg-white rounded-3xl border border-navy/10 p-6 shadow-sm">
              <h3 className="text-base font-bold text-navy mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal" />
                Uploaded Documents & Credentials
              </h3>
              <p className="text-xs text-navy/60 mb-4">
                Secure Administrator View: Document URLs are accessible only by verified admins and never exposed to the public marketplace.
              </p>

              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((docUrl, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-2xl bg-beige-light/70 border border-navy/10"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FileText className="w-4 h-4 text-teal flex-shrink-0" />
                        <span className="text-xs font-mono text-navy truncate max-w-xs sm:max-w-md">
                          {docUrl}
                        </span>
                      </div>
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:text-teal-dark px-3 py-1 rounded-full hover:bg-white border border-teal/20 transition-colors flex-shrink-0"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-beige-light/50 border border-navy/10 text-center text-xs text-navy/50">
                  No document links attached to this submission.
                </div>
              )}
            </div>

            {/* Review Audit History */}
            <div className="bg-white rounded-3xl border border-navy/10 p-6 shadow-sm">
              <h3 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal" />
                Review Audit Trail
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-navy/5">
                  <span className="text-navy/60">Reviewed At</span>
                  <span className="font-medium text-navy">
                    {application.reviewed_at
                      ? new Date(application.reviewed_at).toLocaleString("en-IN")
                      : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-navy/5">
                  <span className="text-navy/60">Reviewed By</span>
                  <span className="font-medium text-navy">
                    {reviewerName
                      ? `${reviewerName} (${reviewerEmail})`
                      : application.reviewed_by || "—"}
                  </span>
                </div>

                {application.rejection_reason && (
                  <div className="py-2">
                    <span className="font-semibold text-rose-900 block mb-1">Rejection Reason</span>
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-950">
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
      <footer className="text-center py-6 text-xs text-navy/50 border-t border-navy/10 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr Balasore • Administrative Application Management</p>
      </footer>
    </div>
  );
}
