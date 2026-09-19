import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  MapPin,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Calendar,
  ShieldCheck,
  Inbox,
  ArrowRight,
} from "lucide-react";

import { TutorOnboardingPaymentCard } from "./TutorOnboardingPaymentCard";

export interface SanitizedTutorApplication {
  id: string;
  full_name: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | string;
  submitted_at: string;
  updated_at?: string;
  rejection_reason?: string | null;
}

interface TutorApplicationStatusProps {
  application: SanitizedTutorApplication | null;
  displayName: string;
  formUrl?: string;
  onboardingPaymentStatus?: "UNPAID" | "PENDING" | "PAID" | "FAILED";
  tutorProfileId?: string | null;
  feeInr?: number;
}

function isValidGoogleFormUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "docs.google.com" ||
        parsed.hostname === "forms.gle" ||
        parsed.hostname === "forms.google.com")
    );
  } catch {
    return false;
  }
}

export function TutorApplicationStatus({
  application,
  displayName,
  formUrl,
  onboardingPaymentStatus = "UNPAID",
  tutorProfileId,
  feeInr = 149,
}: TutorApplicationStatusProps) {
  const isFormConfigured = isValidGoogleFormUrl(formUrl);

  // ----------------------------------------------------
  // STATE A: NO APPLICATION
  // ----------------------------------------------------
  if (!application) {
    return (
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-navy/10 p-8 sm:p-12 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal/10 border border-teal/20 flex items-center justify-center text-teal mx-auto mb-6">
          <GraduationCap className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal bg-sky/30 px-3 py-1 rounded-full mb-4">
          <MapPin className="w-3.5 h-3.5" />
          Balasore Tutor Community
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy mb-3 tracking-tight">
          Become a Tutor on Tutr
        </h1>

        <p className="text-sm text-navy/70 mb-8 max-w-lg mx-auto leading-relaxed">
          Teach students in your local area and connect with learners across Balasore.
          Apply with your qualifications, subjects, and preferred localities to join our verified tutor network.
        </p>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-8">
          <div className="p-4 rounded-2xl bg-beige-light/60 border border-navy/5">
            <div className="w-8 h-8 rounded-xl bg-teal/15 text-teal-dark flex items-center justify-center mb-2">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-navy mb-0.5">Hyperlocal Match</h2>
            <p className="text-[11px] text-navy/60 leading-normal">
              Connect with students right in Sahadevkhunta, OT Road, and Balasore localities.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-beige-light/60 border border-navy/5">
            <div className="w-8 h-8 rounded-xl bg-sky/40 text-navy flex items-center justify-center mb-2">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-navy mb-0.5">Flexible Schedule</h2>
            <p className="text-[11px] text-navy/60 leading-normal">
              Choose your weekly availability, preferred batches, and home tuition modes.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-beige-light/60 border border-navy/5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-navy mb-0.5">Verified Badge</h2>
            <p className="text-[11px] text-navy/60 leading-normal">
              Earn parent trust with an admin-reviewed credential verification.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        {isFormConfigured ? (
          <div className="space-y-3">
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-all shadow-sm hover:shadow"
            >
              <span>Apply to Become a Tutor</span>
              <ExternalLink className="w-4 h-4 text-teal" />
            </a>
            <p className="text-[11px] text-navy/50">
              Opens our official Google Tutor Application Form in a new tab.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 text-left">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Application Intake Configuration Notice</span>
            </div>
            <p className="text-amber-800">
              The official tutor application form is currently being configured for Balasore educators.
              Please check back shortly or contact administration.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE B: PENDING
  // ----------------------------------------------------
  if (application.status === "PENDING") {
    const formattedDate = new Date(application.submitted_at).toLocaleDateString("en-IN", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    return (
      <div className="max-w-lg w-full bg-white rounded-3xl border border-navy/10 p-8 sm:p-12 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto mb-6">
          <Clock className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-100/70 border border-amber-200 px-3 py-1 rounded-full mb-4">
          <Clock className="w-3.5 h-3.5" />
          PENDING
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy mb-2 tracking-tight">
          Application Submitted
        </h1>

        <p className="text-sm text-navy/70 mb-6 leading-relaxed">
          Hello <strong>{displayName}</strong>, your tutor application has been received and is waiting for review.
        </p>

        <div className="p-5 rounded-2xl bg-beige-light/80 border border-navy/10 text-xs text-navy/80 mb-8 text-left space-y-2">
          <div className="flex items-center justify-between border-b border-navy/5 pb-2">
            <span className="text-navy/60">Submitted Date</span>
            <span className="font-semibold text-navy">{formattedDate}</span>
          </div>
          <div className="flex items-center justify-between border-b border-navy/5 pb-2">
            <span className="text-navy/60">Review Stage</span>
            <span className="font-medium text-amber-700">Intake Queue</span>
          </div>
          <p className="text-[11px] text-navy/60 pt-1 leading-normal">
            We&apos;ll update your application status here after review. Submissions are reviewed in order of receipt by our Balasore academic team.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-medium text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-teal" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE C: UNDER_REVIEW
  // ----------------------------------------------------
  if (application.status === "UNDER_REVIEW") {
    const formattedDate = new Date(application.submitted_at).toLocaleDateString("en-IN", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    return (
      <div className="max-w-lg w-full bg-white rounded-3xl border border-navy/10 p-8 sm:p-12 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 mx-auto mb-6">
          <Play className="w-8 h-8 fill-current" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-800 bg-sky-100 border border-sky-200 px-3 py-1 rounded-full mb-4">
          <Play className="w-3.5 h-3.5 fill-current" />
          UNDER REVIEW
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy mb-2 tracking-tight">
          Application Under Review
        </h1>

        <p className="text-sm text-navy/70 mb-6 leading-relaxed">
          Our team is currently reviewing your tutor application and verifying your submitted credentials.
        </p>

        <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 text-xs text-navy/80 mb-8 text-left space-y-2">
          <div className="flex items-center justify-between border-b border-sky-100 pb-2">
            <span className="text-navy/60">Submitted Date</span>
            <span className="font-semibold text-navy">{formattedDate}</span>
          </div>
          <div className="flex items-center justify-between border-b border-sky-100 pb-2">
            <span className="text-navy/60">Verification Status</span>
            <span className="font-semibold text-sky-800">In Progress</span>
          </div>
          <p className="text-[11px] text-navy/60 pt-1 leading-normal">
            Your academic qualification, experience, and teaching preferences are actively being reviewed. You will see an update here once a decision is made.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-medium text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-teal" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE D: APPROVED
  // ----------------------------------------------------
  if (application.status === "APPROVED") {
    // If onboarding payment is pending/unpaid, require the one-time ₹149 payment
    if (onboardingPaymentStatus !== "PAID") {
      return (
        <div className="max-w-lg w-full">
          <TutorOnboardingPaymentCard
            applicationId={application.id}
            tutorProfileId={tutorProfileId}
            feeInr={feeInr}
            initialStatus={onboardingPaymentStatus === "FAILED" ? "FAILED" : "UNPAID"}
          />
        </div>
      );
    }

    return (
      <div className="max-w-lg w-full bg-white rounded-3xl border border-emerald-200 p-8 sm:p-12 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full mb-4">
          <CheckCircle className="w-3.5 h-3.5" />
          APPROVED
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy mb-2 tracking-tight">
          You&apos;re a Verified Tutr Tutor
        </h1>

        <p className="text-sm text-navy/70 mb-6 leading-relaxed">
          Congratulations, <strong>{displayName}</strong>! Your tutor application has been approved. You are now a verified educator on Tutr Balasore.
        </p>

        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 mb-8 text-left space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Profile Verified & Active</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-normal">
            Your verified tutor profile has been provisioned and is now listed on the public Balasore tutor marketplace.
          </p>
          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700">Verification Tier:</span>
            <span className="font-bold text-emerald-900">Balasore Verified Educator</span>
          </div>
        </div>

        {/* Phase 5: Active Link to Tutor Requests Dashboard */}
        <div className="space-y-4">
          <Link
            href="/tutor/requests"
            className="w-full inline-flex items-center justify-between p-4 rounded-2xl bg-teal/10 hover:bg-teal/15 border border-teal/20 text-navy transition-all shadow-sm group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy">
                  View Student Requests
                </h3>
                <p className="text-[11px] text-navy/70">
                  Manage incoming student tuition requests and availability
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-teal group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <div className="p-3.5 rounded-2xl bg-beige-light border border-navy/10 flex items-center justify-between text-xs text-navy/70">
            <span className="font-medium">Tutor Dashboard</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky/50 text-navy border border-sky">
              Coming Soon
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-medium text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-teal" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE E: REJECTED
  // ----------------------------------------------------
  if (application.status === "REJECTED") {
    return (
      <div className="max-w-lg w-full bg-white rounded-3xl border border-rose-200 p-8 sm:p-12 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-6">
          <XCircle className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-800 bg-rose-100 border border-rose-200 px-3 py-1 rounded-full mb-4">
          <XCircle className="w-3.5 h-3.5" />
          REJECTED
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy mb-2 tracking-tight">
          Application Not Approved
        </h1>

        <p className="text-sm text-navy/70 mb-6 leading-relaxed">
          Thank you for applying to Tutr. After reviewing your submission, our team is unable to approve your application at this time.
        </p>

        {application.rejection_reason && (
          <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-left mb-8 space-y-1.5">
            <span className="font-bold text-rose-950 uppercase tracking-wider text-[10px] block">
              Review Feedback
            </span>
            <p className="text-rose-900 leading-relaxed">
              {application.rejection_reason}
            </p>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-beige-light/70 border border-navy/10 text-xs text-navy/70 text-left mb-8">
          <p className="leading-normal">
            Applications are evaluated against Balasore academic credential requirements. If you have questions regarding your submission, please reach out to our team.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-medium text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-teal" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE F: SAFE FALLBACK
  // ----------------------------------------------------
  return (
    <div className="max-w-lg w-full bg-white rounded-3xl border border-navy/10 p-8 sm:p-12 shadow-sm text-center">
      <div className="w-16 h-16 rounded-2xl bg-beige border border-navy/10 flex items-center justify-center text-navy mx-auto mb-6">
        <BookOpen className="w-8 h-8 text-teal" />
      </div>

      <h1 className="text-2xl font-extrabold text-navy mb-2">
        Application Processing
      </h1>

      <p className="text-xs text-navy/70 mb-6 leading-relaxed">
        Your application record is registered in our system. Please check back shortly for status updates.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-medium text-xs transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-teal" />
        <span>Back to Home</span>
      </Link>
    </div>
  );
}
