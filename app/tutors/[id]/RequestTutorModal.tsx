"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  GraduationCap,
} from "lucide-react";
import { submitTutorRequestAction } from "../actions";

export interface OptionItem {
  id: string;
  name: string;
}

interface RequestTutorModalProps {
  tutorId: string;
  tutorName: string;
  subjects: OptionItem[];
  classes: OptionItem[];
  isAuthenticated: boolean;
  onClose: () => void;
}

export function RequestTutorModal({
  tutorId,
  tutorName,
  subjects,
  classes,
  isAuthenticated,
  onClose,
}: RequestTutorModalProps) {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState<string>(
    subjects.length === 1 ? subjects[0].id : ""
  );
  const [classId, setClassId] = useState<string>(
    classes.length === 1 ? classes[0].id : ""
  );
  const [message, setMessage] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // If user is not authenticated, prompt to sign in
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="max-w-md w-full bg-white rounded-3xl border-2 border-ink p-6 sm:p-8 shadow-[6px_6px_0px_#18121E] relative text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full border border-ink/20 text-ink/60 hover:text-ink hover:bg-canvas-lavender transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-purple-accent/20 border-2 border-ink text-ink flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#18121E]">
            <Lock className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-black text-ink mb-2">
            Sign In Required
          </h3>
          <p className="text-sm text-ink/70 mb-6 leading-relaxed">
            Please sign in as a student to send a tuition request to{" "}
            <span className="font-bold text-ink">{tutorName}</span>.
          </p>

          <button
            onClick={() => {
              router.push(`/login?next=/tutors/${tutorId}`);
            }}
            className="w-full tutr-btn-student py-3 px-6 text-sm flex items-center justify-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Sign in as Student</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subjectId) {
      setError("Please select a subject.");
      return;
    }
    if (!classId) {
      setError("Please select a class.");
      return;
    }

    setLoading(true);
    try {
      const result = await submitTutorRequestAction({
        tutorId,
        subjectId,
        classId,
        message,
      });

      if (!result.success) {
        setError(result.error || "Failed to submit request.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="max-w-lg w-full bg-white rounded-3xl border-2 border-ink p-6 sm:p-8 shadow-[6px_6px_0px_#18121E] relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full border border-ink/20 text-ink/60 hover:text-ink hover:bg-canvas-lavender transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-mint-badge/30 border-2 border-ink text-ink flex items-center justify-center mx-auto shadow-[3px_3px_0px_#18121E]">
              <CheckCircle2 className="w-8 h-8 text-emerald-700" />
            </div>

            <h3 className="text-2xl font-black text-ink">
              Request Sent Successfully!
            </h3>

            <p className="text-sm text-ink/70 max-w-sm mx-auto leading-relaxed">
              Your tutor request to{" "}
              <span className="font-bold text-ink">{tutorName}</span> has
              been submitted and is now <strong className="text-ink">PENDING</strong> review.
            </p>

            <div className="p-4 rounded-2xl bg-canvas-lavender border-2 border-ink/40 text-xs text-ink/80 text-left space-y-1.5 shadow-[2px_2px_0px_rgba(24,18,30,0.1)]">
              <div className="flex items-center gap-1.5 font-bold text-ink">
                <Lock className="w-3.5 h-3.5 text-warm-coral" />
                <span>Privacy Protected</span>
              </div>
              <p>
                Your personal contact details remain private. You can track the status of this request in your Student Requests dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  router.push("/student/requests");
                }}
                className="w-full sm:w-auto tutr-btn-student py-2.5 px-6 text-sm"
              >
                View My Requests
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full border-2 border-ink bg-white font-bold text-ink text-sm hover:bg-gray-100 transition-colors shadow-[2px_2px_0px_#18121E]"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-honey/20 border-2 border-ink text-ink flex items-center justify-center shadow-[2px_2px_0px_#18121E]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-ink">
                  Request Tutor
                </h3>
                <p className="text-xs text-ink/70">
                  Sending request to <span className="font-bold text-ink">{tutorName}</span>
                </p>
              </div>
            </div>

            {error && (
              <div
                className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-900 flex items-start gap-2.5 font-medium"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Subject Select */}
            <div>
              <label
                htmlFor="subject"
                className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5"
              >
                Subject <span className="text-rose-500">*</span>
              </label>
              <select
                id="subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-ink bg-white text-ink font-medium focus:outline-none focus:ring-2 focus:ring-purple-accent shadow-[2px_2px_0px_#18121E]"
              >
                <option value="">Select subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Select */}
            <div>
              <label
                htmlFor="class"
                className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5"
              >
                Class / Grade <span className="text-rose-500">*</span>
              </label>
              <select
                id="class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                required
                className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-ink bg-white text-ink font-medium focus:outline-none focus:ring-2 focus:ring-purple-accent shadow-[2px_2px_0px_#18121E]"
              >
                <option value="">Select target class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Student Message */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="message"
                  className="block text-xs font-bold uppercase tracking-wider text-ink/70"
                >
                  Message / Learning Goals (Optional)
                </label>
                <span className="text-[10px] font-bold text-ink/50">
                  {message.length}/500
                </span>
              </div>
              <textarea
                id="message"
                rows={3}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Need assistance with CBSE Class 10 Board exam prep and concept clarification."
                className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-ink bg-white text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-purple-accent resize-none shadow-[2px_2px_0px_#18121E]"
              />
            </div>

            {/* Privacy notice */}
            <div className="p-3 rounded-xl bg-canvas-lavender border-2 border-ink/30 text-[11px] text-ink/80 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-warm-coral flex-shrink-0" />
              <span>
                Your contact details are protected and will not be shared with the tutor in Phase 5.
              </span>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-full border-2 border-ink/30 text-ink text-xs font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="tutr-btn-student py-2.5 px-6 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Submitting Request...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
