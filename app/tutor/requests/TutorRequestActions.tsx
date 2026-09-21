"use client";

import React, { useState } from "react";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import {
  acceptTutorRequestAction,
  declineTutorRequestAction,
} from "./actions";

interface TutorRequestActionsProps {
  requestId: string;
  studentName: string;
}

export function TutorRequestActions({
  requestId,
  studentName,
}: TutorRequestActionsProps) {
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading("accept");
    setError(null);
    try {
      const res = await acceptTutorRequestAction(requestId);
      if (!res.success) {
        setError(res.error || "Failed to accept request.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async () => {
    setLoading("decline");
    setError(null);
    try {
      const res = await declineTutorRequestAction(requestId);
      if (!res.success) {
        setError(res.error || "Failed to decline request.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button
          onClick={handleDecline}
          disabled={loading !== null}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full border-2 border-ink bg-rose-50 text-rose-900 text-xs font-bold hover:bg-rose-100 disabled:opacity-50 transition-colors shadow-[1px_1px_0px_#18121E]"
          title={`Decline request from ${studentName}`}
        >
          {loading === "decline" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <X className="w-3.5 h-3.5 text-rose-600" />
              <span>Decline</span>
            </>
          )}
        </button>

        <button
          onClick={handleAccept}
          disabled={loading !== null}
          className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full border-2 border-ink bg-mint-badge text-ink text-xs font-bold hover:bg-mint-badge/80 disabled:opacity-50 transition-all shadow-[2px_2px_0px_#18121E]"
          title={`Accept request from ${studentName}`}
        >
          {loading === "accept" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Accept</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
