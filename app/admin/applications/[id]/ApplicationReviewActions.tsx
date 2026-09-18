"use client";

import React, { useState, useTransition } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  startApplicationReview,
  approveApplication,
  rejectApplication,
} from "../actions";

interface ApplicationReviewActionsProps {
  applicationId: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
}

export function ApplicationReviewActions({
  applicationId,
  status,
  rejectionReason,
}: ApplicationReviewActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reasonText, setReasonText] = useState("");

  const handleStartReview = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await startApplicationReview(applicationId);
      if (res.success) {
        setSuccessMsg(res.message || "Application is now UNDER_REVIEW.");
      } else {
        setErrorMsg(res.error || "Failed to start review.");
      }
    });
  };

  const handleApprove = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await approveApplication(applicationId);
      setShowApproveModal(false);
      if (res.success) {
        setSuccessMsg(res.message || "Application approved and verified profile provisioned.");
      } else {
        setErrorMsg(res.error || "Failed to approve application.");
      }
    });
  };

  const handleReject = () => {
    const trimmed = reasonText.trim();
    if (trimmed.length < 3) {
      setErrorMsg("Please provide a rejection reason of at least 3 characters.");
      return;
    }
    if (trimmed.length > 1000) {
      setErrorMsg("Rejection reason cannot exceed 1000 characters.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await rejectApplication(applicationId, trimmed);
      setShowRejectModal(false);
      if (res.success) {
        setSuccessMsg(res.message || "Application marked as REJECTED.");
      } else {
        setErrorMsg(res.error || "Failed to reject application.");
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-navy/10 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 border-b border-navy/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Review Decision & Status</h2>
          <p className="text-xs text-navy/60">
            Administrative workflow controls governed by database state constraints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === "PENDING" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              PENDING
            </span>
          )}
          {status === "UNDER_REVIEW" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
              <Play className="w-3.5 h-3.5 fill-current" />
              UNDER REVIEW
            </span>
          )}
          {status === "APPROVED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              APPROVED
            </span>
          )}
          {status === "REJECTED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
              <XCircle className="w-3.5 h-3.5" />
              REJECTED
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* Action Buttons based on status */}
      <div className="space-y-4">
        {status === "PENDING" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-beige-light/70 border border-navy/10">
            <div>
              <p className="text-sm font-semibold text-navy">Application Awaiting Intake Review</p>
              <p className="text-xs text-navy/60">
                Move to Under Review before making a final approval or rejection decision.
              </p>
            </div>
            <button
              onClick={handleStartReview}
              disabled={isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-dark transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Review</span>
                </>
              )}
            </button>
          </div>
        )}

        {status === "UNDER_REVIEW" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 text-xs text-navy/80">
              <p className="font-semibold text-navy mb-1">Active Review State</p>
              <p>
                Verify teaching qualifications, experience, and uploaded certificates below.
                Approving will atomically provision a verified tutor profile on the public marketplace.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setShowApproveModal(true);
                }}
                disabled={isPending}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve Application</span>
              </button>

              <button
                onClick={() => {
                  setErrorMsg(null);
                  setShowRejectModal(true);
                }}
                disabled={isPending}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Application</span>
              </button>
            </div>
          </div>
        )}

        {status === "APPROVED" && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <p className="font-bold flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Application Approved & Profile Provisioned
            </p>
            <p>
              This tutor is verified (<code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">is_verified = true</code>)
              and eligible to appear on the public Balasore tutor marketplace view.
            </p>
          </div>
        )}

        {status === "REJECTED" && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
            <p className="font-bold flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-rose-600" />
              Application Rejected
            </p>
            <p className="mb-2">
              This application was denied by an administrator and does not have an active public tutor profile.
            </p>
            {rejectionReason && (
              <div className="p-3 bg-white rounded-xl border border-rose-200 font-sans">
                <span className="font-semibold text-rose-950">Reason: </span>
                {rejectionReason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-navy/10 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-navy mb-2">Confirm Tutor Approval</h3>
            <p className="text-xs text-navy/70 mb-6 leading-relaxed">
              This will mark the application as <strong>APPROVED</strong> and atomically provision a
              verified profile in <code className="bg-beige-light px-1 py-0.5 rounded font-mono">public.tutor_profiles</code> with{" "}
              <code className="bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded font-mono">is_verified = true</code>.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                disabled={isPending}
                className="px-5 py-2 rounded-full border border-navy/20 hover:bg-beige/40 text-navy text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <span>Confirm Approval</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-navy/10 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-navy mb-2">Reject Tutor Application</h3>
            <p className="text-xs text-navy/70 mb-4 leading-relaxed">
              Please document the specific reason for rejecting this application. This audit log will be
              preserved in the database.
            </p>

            <div className="mb-4">
              <label htmlFor="rejectionReason" className="block text-xs font-semibold text-navy mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejectionReason"
                rows={4}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="e.g. Qualifications could not be verified; certificates incomplete or missing."
                maxLength={1000}
                className="w-full rounded-2xl border border-navy/20 p-3 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <div className="flex justify-between items-center text-[10px] text-navy/50 mt-1">
                <span>Min 3 characters</span>
                <span>{reasonText.length}/1000</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={isPending}
                className="px-5 py-2 rounded-full border border-navy/20 hover:bg-beige/40 text-navy text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isPending || reasonText.trim().length < 3}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Confirm Rejection</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
