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
        <span className="text-[11px] font-bold text-ink/70">Cancel request?</span>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-ink bg-rose-500 text-white text-[11px] font-bold hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-[1px_1px_0px_#18121E]"
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
          className="px-3 py-1 rounded-full border-2 border-ink/40 text-ink text-[11px] font-bold hover:bg-gray-100 transition-colors"
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
        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold transition-colors"
      >
        <XCircle className="w-3.5 h-3.5" />
        <span>Cancel Request</span>
      </button>
      {error && <p className="text-[10px] text-rose-600 font-bold mt-1">{error}</p>}
    </div>
  );
}
