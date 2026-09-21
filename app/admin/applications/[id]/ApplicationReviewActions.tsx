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
  searchTutrUsers,
  linkApplicationUser,
} from "../actions";
import { Link2, Search, UserCheck } from "lucide-react";

interface ApplicationReviewActionsProps {
  applicationId: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  userId?: string | null;
  rejectionReason?: string | null;
}

export function ApplicationReviewActions({
  applicationId,
  status,
  userId,
  rejectionReason,
}: ApplicationReviewActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Link user modal states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; full_name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; full_name: string } | null>(null);

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reasonText, setReasonText] = useState("");

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchTutrUsers(q);
      if (res.success && res.users) {
        setSearchResults(res.users as Array<{ id: string; email: string; full_name: string }>);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkUser = () => {
    if (!selectedUser) {
      setErrorMsg("Please select a registered Tutr user account to link.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await linkApplicationUser(applicationId, selectedUser.id);
      setShowLinkModal(false);
      if (res.success) {
        setSuccessMsg(res.message || "User account successfully linked!");
      } else {
        setErrorMsg(res.error || "Failed to link user account.");
      }
    });
  };

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
    <div className="bg-white rounded-3xl border-2 border-ink p-6 shadow-[3px_3px_0px_#18121E]">
      <div className="flex items-center justify-between mb-4 border-b-2 border-ink/10 pb-4">
        <div>
          <h2 className="text-lg font-black text-ink">Review Decision & Status</h2>
          <p className="text-xs text-ink/70">
            Administrative workflow controls governed by database state constraints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status === "PENDING" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-warm-honey text-ink border border-ink">
              <Clock className="w-3.5 h-3.5" />
              PENDING
            </span>
          )}
          {status === "UNDER_REVIEW" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-soft-purple text-ink border border-ink">
              <Play className="w-3.5 h-3.5 fill-current text-purple-800" />
              UNDER REVIEW
            </span>
          )}
          {status === "APPROVED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-mint text-ink border border-ink">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-800" />
              APPROVED
            </span>
          )}
          {status === "REJECTED" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-400 text-white border border-ink">
              <XCircle className="w-3.5 h-3.5" />
              REJECTED
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-50 border-2 border-ink flex items-start gap-3 text-rose-800 text-xs shadow-[2px_2px_0px_#18121E]">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1 font-bold">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-mint/40 border-2 border-ink flex items-start gap-3 text-ink text-xs shadow-[2px_2px_0px_#18121E]">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-700" />
          <div className="flex-1 font-bold">{successMsg}</div>
        </div>
      )}

      {/* Action Buttons based on status */}
      <div className="space-y-4">
        {status === "PENDING" && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-canvas-lavender/40 border-2 border-ink">
            <div>
              <p className="text-sm font-black text-ink">Application Awaiting Intake Review</p>
              <p className="text-xs text-ink/70">
                Move to Under Review before making a final approval or rejection decision.
              </p>
            </div>
            <button
              onClick={handleStartReview}
              disabled={isPending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-ink text-white text-sm font-bold border-2 border-ink shadow-[2px_2px_0px_#F28F85] hover:-translate-y-0.5 active:translate-y-0 transition-transform disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-warm-coral" />
                  <span>Start Review</span>
                </>
              )}
            </button>
          </div>
        )}

        {status === "UNDER_REVIEW" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-soft-purple/30 border-2 border-ink text-xs text-ink">
              <p className="font-black text-ink mb-1">Active Review State</p>
              <p className="font-medium text-ink/80">
                Verify teaching qualifications, experience, and uploaded certificates below.
                Approving will atomically provision a verified tutor profile on the public marketplace.
              </p>
            </div>

            {!userId && (
              <div className="p-4 rounded-2xl bg-warm-honey/40 border-2 border-ink flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink shadow-[2px_2px_0px_#18121E]">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black">Applicant Not Linked to a Tutr User Account</p>
                    <p className="text-ink/80 font-medium">
                      Approval requires an authenticated Tutr user account. You can link this application to an existing registered user.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setErrorMsg(null);
                    setShowLinkModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-warm-honey hover:bg-warm-honey/90 text-ink border-2 border-ink font-bold text-xs transition-transform active:translate-y-0.5 shadow-[2px_2px_0px_#18121E] flex-shrink-0"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link User Account</span>
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setShowApproveModal(true);
                }}
                disabled={isPending}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-mint hover:bg-mint/90 text-ink border-2 border-ink font-black text-sm transition-transform active:translate-y-0.5 shadow-[3px_3px_0px_#18121E] disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 text-emerald-800" />
                <span>Approve Application</span>
              </button>

              <button
                onClick={() => {
                  setErrorMsg(null);
                  setShowRejectModal(true);
                }}
                disabled={isPending}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-rose-400 hover:bg-rose-500 text-white border-2 border-ink font-black text-sm transition-transform active:translate-y-0.5 shadow-[3px_3px_0px_#18121E] disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Application</span>
              </button>
            </div>
          </div>
        )}

        {status === "APPROVED" && (
          <div className="p-4 rounded-2xl bg-mint/30 border-2 border-ink text-xs text-ink shadow-[2px_2px_0px_#18121E]">
            <p className="font-black flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              Application Approved & Profile Provisioned
            </p>
            <p className="font-medium text-ink/80">
              This tutor is verified (<code className="bg-white px-1 py-0.5 rounded font-mono font-bold border border-ink">is_verified = true</code>)
              and eligible to appear on the public Balasore tutor marketplace view.
            </p>
          </div>
        )}

        {status === "REJECTED" && (
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-ink text-xs text-ink shadow-[2px_2px_0px_#18121E]">
            <p className="font-black flex items-center gap-2 mb-1 text-rose-800">
              <XCircle className="w-4 h-4 text-rose-600" />
              Application Rejected
            </p>
            <p className="mb-2 font-medium text-ink/80">
              This application was denied by an administrator and does not have an active public tutor profile.
            </p>
            {rejectionReason && (
              <div className="p-3 bg-white rounded-xl border-2 border-ink font-sans">
                <span className="font-bold text-ink">Reason: </span>
                <span className="font-medium text-ink/80">{rejectionReason}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#18121E] border-2 border-ink animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-mint border-2 border-ink flex items-center justify-center text-ink mb-4 shadow-[2px_2px_0px_#18121E]">
              <CheckCircle className="w-6 h-6 text-emerald-800" />
            </div>

            <h3 className="text-xl font-black text-ink mb-2">Confirm Tutor Approval</h3>
            <p className="text-xs text-ink/80 mb-6 leading-relaxed font-medium">
              This will mark the application as <strong>APPROVED</strong> and atomically provision a
              verified profile in <code className="bg-canvas-lavender px-1 py-0.5 rounded font-mono font-bold border border-ink">public.tutor_profiles</code> with{" "}
              <code className="bg-mint text-ink px-1 py-0.5 rounded font-mono font-bold border border-ink">is_verified = true</code>.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                disabled={isPending}
                className="px-5 py-2 rounded-full border-2 border-ink hover:bg-canvas-lavender text-ink text-xs font-bold transition-all shadow-[2px_2px_0px_#18121E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-mint hover:bg-mint/90 text-ink border-2 border-ink text-xs font-black transition-transform active:translate-y-0.5 shadow-[2px_2px_0px_#18121E] disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#18121E] border-2 border-ink animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-ink flex items-center justify-center text-rose-600 mb-4 shadow-[2px_2px_0px_#18121E]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-ink mb-2">Reject Tutor Application</h3>
            <p className="text-xs text-ink/80 mb-4 leading-relaxed font-medium">
              Please document the specific reason for rejecting this application. This audit log will be
              preserved in the database.
            </p>

            <div className="mb-4">
              <label htmlFor="rejectionReason" className="block text-xs font-bold text-ink mb-1.5">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="rejectionReason"
                rows={4}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="e.g. Qualifications could not be verified; certificates incomplete or missing."
                maxLength={1000}
                className="w-full rounded-2xl border-2 border-ink p-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <div className="flex justify-between items-center text-[10px] text-ink/60 mt-1 font-bold">
                <span>Min 3 characters</span>
                <span>{reasonText.length}/1000</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={isPending}
                className="px-5 py-2 rounded-full border-2 border-ink hover:bg-canvas-lavender text-ink text-xs font-bold transition-all shadow-[2px_2px_0px_#18121E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isPending || reasonText.trim().length < 3}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-rose-400 hover:bg-rose-500 text-white border-2 border-ink text-xs font-black transition-transform active:translate-y-0.5 shadow-[2px_2px_0px_#18121E] disabled:opacity-50"
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

      {/* Link User Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-xs">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_#18121E] border-2 border-ink animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-warm-honey border-2 border-ink flex items-center justify-center text-ink mb-4 shadow-[2px_2px_0px_#18121E]">
              <Link2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-ink mb-2">Link Tutr User Account</h3>
            <p className="text-xs text-ink/80 mb-4 leading-relaxed font-medium">
              Search for the registered Tutr user account (by email or full name) to associate with this application.
            </p>

            <div className="mb-4">
              <label htmlFor="userSearch" className="block text-xs font-bold text-ink mb-1.5">
                Search Registered Users
              </label>
              <div className="relative">
                <input
                  id="userSearch"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Type email (e.g. surajbasa...) or name"
                  className="w-full rounded-2xl border-2 border-ink pl-9 pr-4 py-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-warm-honey"
                />
                <Search className="w-4 h-4 text-ink/40 absolute left-3 top-3" />
                {isSearching && (
                  <Loader2 className="w-3.5 h-3.5 text-ink animate-spin absolute right-3 top-3" />
                )}
              </div>
            </div>

            {/* Results List */}
            {searchResults.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto space-y-2 pr-1">
                {searchResults.map((u) => {
                  const isSelected = selectedUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left p-3 rounded-xl border-2 border-ink text-xs transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-warm-honey text-ink font-bold shadow-[2px_2px_0px_#18121E]"
                          : "bg-white text-ink hover:bg-canvas-lavender"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-black truncate">{u.full_name || "Unnamed User"}</p>
                        <p className="text-[11px] text-ink/70 font-mono truncate">{u.email}</p>
                      </div>
                      {isSelected && <UserCheck className="w-4 h-4 text-ink flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedUser && (
              <div className="mb-4 p-3 rounded-xl bg-mint/40 border-2 border-ink text-xs text-ink font-bold">
                <span>Selected Account: </span>
                <span>{selectedUser.full_name} ({selectedUser.email})</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedUser(null);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                disabled={isPending}
                className="px-5 py-2 rounded-full border-2 border-ink hover:bg-canvas-lavender text-ink text-xs font-bold transition-all shadow-[2px_2px_0px_#18121E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLinkUser}
                disabled={isPending || !selectedUser}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-warm-honey hover:bg-warm-honey/90 text-ink border-2 border-ink text-xs font-black transition-transform active:translate-y-0.5 shadow-[2px_2px_0px_#18121E] disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Linking...</span>
                  </>
                ) : (
                  <span>Confirm Link</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
