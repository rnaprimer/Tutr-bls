"use client";

import React, { useState } from "react";
import { XCircle, Loader2 } from "lucide-react";
import { cancelTutorRequestAction } from "./actions";

interface CancelRequestButtonProps {
  requestId: string;
}

export function CancelRequestButton({
  requestId,
}: CancelRequestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await cancelTutorRequestAction(requestId);
      if (!res.success) {
        setError(res.error || "Failed to cancel request.");
        setConfirming(false);
      }
    } catch {
      setError("An unexpected error occurred.");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-navy/70">Cancel request?</span>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <span>Yes, Cancel</span>
          )}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="px-2 py-1 rounded-lg border border-navy/20 text-navy text-[11px] hover:bg-beige/60 transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors"
      >
        <XCircle className="w-3.5 h-3.5" />
        <span>Cancel Request</span>
      </button>
      {error && <p className="text-[10px] text-rose-600 mt-1">{error}</p>}
    </div>
  );
}
