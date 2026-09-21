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
      <div className="max-w-2xl w-full tutr-card bg-white p-8 sm:p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-accent/20 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-6 shadow-[3px_3px_0px_#18121E]">
          <GraduationCap className="w-8 h-8 text-warm-coral" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ink bg-honey/30 border border-ink px-3 py-1 rounded-full mb-4 shadow-[1px_1px_0px_#18121E]">
          <MapPin className="w-3.5 h-3.5 text-warm-coral" />
          Balasore Tutor Community
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-ink mb-3 tracking-tight">
          Become a Tutor on Tutr
        </h1>

        <p className="text-sm text-ink/70 mb-8 max-w-lg mx-auto leading-relaxed font-medium">
          Teach students in your local area and connect with learners across Balasore.
          Apply with your qualifications, subjects, and preferred localities to join our verified tutor network.
        </p>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-8">
          <div className="p-4 rounded-2xl bg-warm-coral/10 border-2 border-ink shadow-[2px_2px_0px_#18121E]">
            <div className="w-8 h-8 rounded-xl bg-warm-coral border border-ink text-white flex items-center justify-center mb-2 shadow-[1px_1px_0px_#18121E]">
              <MapPin className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-black text-ink mb-0.5">Hyperlocal Match</h2>
            <p className="text-[11px] text-ink/70 font-medium leading-normal">
              Connect with students right in Sahadevkhunta, OT Road, and Balasore localities.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-honey/20 border-2 border-ink shadow-[2px_2px_0px_#18121E]">
            <div className="w-8 h-8 rounded-xl bg-honey border border-ink text-ink flex items-center justify-center mb-2 shadow-[1px_1px_0px_#18121E]">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-black text-ink mb-0.5">Flexible Schedule</h2>
            <p className="text-[11px] text-ink/70 font-medium leading-normal">
              Choose your weekly availability, preferred batches, and home tuition modes.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-accent/20 border-2 border-ink shadow-[2px_2px_0px_#18121E]">
            <div className="w-8 h-8 rounded-xl bg-mint-badge border border-ink text-ink flex items-center justify-center mb-2 shadow-[1px_1px_0px_#18121E]">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
            </div>
            <h2 className="text-xs font-black text-ink mb-0.5">Verified Badge</h2>
            <p className="text-[11px] text-ink/70 font-medium leading-normal">
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
              className="tutr-btn-tutor py-3.5 px-8 text-sm inline-flex items-center gap-2"
            >
              <span>Apply to Become a Tutor</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-[11px] text-ink/50 font-medium">
              Opens our official Google Tutor Application Form in a new tab.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-honey/20 border-2 border-ink text-xs text-ink text-left shadow-[2px_2px_0px_#18121E]">
            <div className="flex items-center gap-2 font-black mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Application Intake Configuration Notice</span>
            </div>
            <p className="text-ink/80 font-medium">
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
      <div className="max-w-lg w-full tutr-card bg-white p-8 sm:p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-honey/20 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-6 shadow-[3px_3px_0px_#18121E]">
          <Clock className="w-8 h-8 text-amber-700" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ink bg-honey/40 border-2 border-ink px-3 py-1 rounded-full mb-4 shadow-[1px_1px_0px_#18121E]">
          <Clock className="w-3.5 h-3.5 text-amber-700" />
          PENDING
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-ink mb-2 tracking-tight">
          Application Submitted
        </h1>

        <p className="text-sm text-ink/70 mb-6 leading-relaxed font-medium">
          Hello <strong className="text-ink">{displayName}</strong>, your tutor application has been received and is waiting for review.
        </p>

        <div className="p-5 rounded-2xl bg-canvas-lavender border-2 border-ink/40 text-xs text-ink mb-8 text-left space-y-2 shadow-[2px_2px_0px_rgba(24,18,30,0.1)]">
          <div className="flex items-center justify-between border-b border-ink/10 pb-2">
            <span className="text-ink/60 font-medium">Submitted Date</span>
            <span className="font-bold text-ink">{formattedDate}</span>
          </div>
          <div className="flex items-center justify-between border-b border-ink/10 pb-2">
            <span className="text-ink/60 font-medium">Review Stage</span>
            <span className="font-black text-amber-700">Intake Queue</span>
          </div>
          <p className="text-[11px] text-ink/70 pt-1 leading-normal font-medium">
            We&apos;ll update your application status here after review. Submissions are reviewed in order of receipt by our Balasore academic team.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-2 border-ink bg-white hover:bg-gray-50 text-ink font-bold text-xs transition-colors shadow-[2px_2px_0px_#18121E]"
        >
          <ArrowLeft className="w-4 h-4 text-warm-coral" />
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
      <div className="max-w-lg w-full tutr-card bg-white p-8 sm:p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-accent/20 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-6 shadow-[3px_3px_0px_#18121E]">
          <Play className="w-8 h-8 fill-current text-warm-coral" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ink bg-purple-accent/30 border-2 border-ink px-3 py-1 rounded-full mb-4 shadow-[1px_1px_0px_#18121E]">
          <Play className="w-3.5 h-3.5 fill-current text-warm-coral" />
          UNDER REVIEW
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-ink mb-2 tracking-tight">
          Application Under Review
        </h1>

        <p className="text-sm text-ink/70 mb-6 leading-relaxed font-medium">
          Our team is currently reviewing your tutor application and verifying your submitted credentials.
        </p>

        <div className="p-5 rounded-2xl bg-canvas-lavender border-2 border-ink/40 text-xs text-ink mb-8 text-left space-y-2 shadow-[2px_2px_0px_rgba(24,18,30,0.1)]">
          <div className="flex items-center justify-between border-b border-ink/10 pb-2">
            <span className="text-ink/60 font-medium">Submitted Date</span>
            <span className="font-bold text-ink">{formattedDate}</span>
          </div>
          <div className="flex items-center justify-between border-b border-ink/10 pb-2">
            <span className="text-ink/60 font-medium">Verification Status</span>
            <span className="font-black text-warm-coral">In Progress</span>
          </div>
          <p className="text-[11px] text-ink/70 pt-1 leading-normal font-medium">
            Your academic qualification, experience, and teaching preferences are actively being reviewed. You will see an update here once a decision is made.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-2 border-ink bg-white hover:bg-gray-50 text-ink font-bold text-xs transition-colors shadow-[2px_2px_0px_#18121E]"
        >
          <ArrowLeft className="w-4 h-4 text-warm-coral" />
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
      <div className="max-w-lg w-full tutr-card bg-white p-8 sm:p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-mint-badge/30 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-6 shadow-[3px_3px_0px_#18121E]">
          <CheckCircle className="w-8 h-8 text-emerald-800" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ink bg-mint-badge/40 border-2 border-ink px-3 py-1 rounded-full mb-4 shadow-[1px_1px_0px_#18121E]">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-800" />
          APPROVED
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-ink mb-2 tracking-tight">
          You&apos;re a Verified Tutr Tutor
        </h1>

        <p className="text-sm text-ink/70 mb-6 leading-relaxed font-medium">
          Congratulations, <strong className="text-ink">{displayName}</strong>! Your tutor application has been approved. You are now a verified educator on Tutr Balasore.
        </p>

        <div className="p-5 rounded-2xl bg-mint-badge/20 border-2 border-ink text-xs text-ink mb-8 text-left space-y-2.5 shadow-[2px_2px_0px_#18121E]">
          <div className="flex items-center gap-2 font-black text-ink">
            <Sparkles className="w-4 h-4 text-warm-coral" />
            <span>Profile Verified & Active</span>
          </div>
          <p className="text-[11px] text-ink/80 leading-normal font-medium">
            Your verified tutor profile has been provisioned and is now listed on the public Balasore tutor marketplace.
          </p>
          <div className="pt-2 border-t border-ink/20 flex items-center justify-between text-[11px]">
            <span className="text-ink/60 font-bold">Verification Tier:</span>
            <span className="font-black text-ink">Balasore Verified Educator</span>
          </div>
        </div>

        {/* Phase 5: Active Link to Tutor Requests Dashboard */}
        <div className="space-y-4">
          <Link
            href="/tutor/requests"
            className="w-full inline-flex items-center justify-between p-4 rounded-2xl bg-purple-accent/20 hover:bg-purple-accent/30 border-2 border-ink text-ink transition-all shadow-[3px_3px_0px_#18121E] group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-accent border border-ink text-ink flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-[1px_1px_0px_#18121E]">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-ink">
                  View Student Requests
                </h3>
                <p className="text-[11px] text-ink/70 font-medium">
                  Manage incoming student tuition requests and availability
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-warm-coral group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <div className="p-3.5 rounded-2xl bg-canvas-lavender border-2 border-ink flex items-center justify-between text-xs text-ink/80 font-bold shadow-[2px_2px_0px_#18121E]">
            <span>Tutor Dashboard</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-warm-honey text-ink border border-ink">
              Coming Soon
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-2 border-ink bg-white hover:bg-gray-50 text-ink font-bold text-xs transition-colors shadow-[2px_2px_0px_#18121E]"
            >
              <ArrowLeft className="w-4 h-4 text-warm-coral" />
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
      <div className="max-w-lg w-full tutr-card bg-white p-8 sm:p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-6 shadow-[3px_3px_0px_#18121E]">
          <XCircle className="w-8 h-8 text-rose-600" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-ink bg-rose-100 border-2 border-ink px-3 py-1 rounded-full mb-4 shadow-[1px_1px_0px_#18121E]">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          REJECTED
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-ink mb-2 tracking-tight">
          Application Not Approved
        </h1>

        <p className="text-sm text-ink/70 mb-6 leading-relaxed font-medium">
          Thank you for applying to Tutr. After reviewing your submission, our team is unable to approve your application at this time.
        </p>

        {application.rejection_reason && (
          <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-xs text-left mb-8 space-y-1.5 shadow-[2px_2px_0px_#18121E]">
            <span className="font-black text-rose-950 uppercase tracking-wider text-[10px] block">
              Review Feedback
            </span>
            <p className="text-rose-900 leading-relaxed font-medium">
              {application.rejection_reason}
            </p>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-canvas-lavender border-2 border-ink/30 text-xs text-ink/80 text-left mb-8 font-medium">
          <p className="leading-normal">
            Applications are evaluated against Balasore academic credential requirements. If you have questions regarding your submission, please reach out to our team.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-2 border-ink bg-white hover:bg-gray-50 text-ink font-bold text-xs transition-colors shadow-[2px_2px_0px_#18121E]"
        >
          <ArrowLeft className="w-4 h-4 text-warm-coral" />
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE F: SAFE FALLBACK
  // ----------------------------------------------------
  return (
    <div className="max-w-lg w-full tutr-card bg-white p-8 sm:p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-honey/20 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-6 shadow-[3px_3px_0px_#18121E]">
        <BookOpen className="w-8 h-8 text-warm-coral" />
      </div>

      <h1 className="text-2xl font-black text-ink mb-2">
        Application Processing
      </h1>

      <p className="text-xs text-ink/70 mb-6 leading-relaxed font-medium">
        Your application record is registered in our system. Please check back shortly for status updates.
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-2 border-ink bg-white hover:bg-gray-50 text-ink font-bold text-xs transition-colors shadow-[2px_2px_0px_#18121E]"
      >
        <ArrowLeft className="w-4 h-4 text-warm-coral" />
        <span>Back to Home</span>
      </Link>
    </div>
  );
}
