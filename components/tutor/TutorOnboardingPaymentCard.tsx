"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

interface TutorOnboardingPaymentCardProps {
  applicationId: string;
  tutorProfileId?: string | null;
  feeInr: number;
  initialStatus?: "UNPAID" | "PENDING" | "PAID" | "FAILED";
}

export function TutorOnboardingPaymentCard({
  applicationId,
  tutorProfileId,
  feeInr,
  initialStatus = "UNPAID",
}: TutorOnboardingPaymentCardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"UNPAID" | "PROCESSING" | "PAID" | "FAILED">(
    initialStatus === "PAID" ? "PAID" : initialStatus === "FAILED" ? "FAILED" : "UNPAID"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleStartPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Create Razorpay order via server API
      const orderRes = await fetch("/api/payments/onboarding/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create onboarding payment order.");
      }

      // 2. Ensure Razorpay Checkout script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          "Payment gateway could not be loaded. Please check your internet connection."
        );
      }

      // 3. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "Tutr Balasore",
        description: "One-Time Tutor Onboarding Fee",
        order_id: orderData.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            // Show processing state while server verifies
            setStatus("PROCESSING");
            setLoading(true);

            // 4. Server-side signature verification & atomic activation
            const verifyRes = await fetch("/api/payments/onboarding/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId: orderData.paymentId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            // Only mark PAID after server-side verification succeeds
            setStatus("PAID");
            router.refresh();
          } catch (err: unknown) {
            console.error("Onboarding verification error:", err);
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setStatus("FAILED");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStatus((prev) => (prev === "PAID" ? "PAID" : "FAILED"));
          },
        },
        theme: {
          color: "#0d2b45", // Tutr Navy
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: { error?: { description?: string; code?: string } }) => {
        console.warn("Payment failed:", resp.error);
        setError(resp.error?.description || "Payment was declined or failed.");
        setStatus("FAILED");
        setLoading(false);
      });

      rzp.open();
    } catch (err: unknown) {
      console.error("Checkout initiation error:", err);
      setError(err instanceof Error ? err.message : "Failed to initiate payment.");
      setStatus("FAILED");
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // STATE: PROCESSING
  // ----------------------------------------------------
  if (status === "PROCESSING") {
    return (
      <div className="w-full bg-white rounded-3xl border border-sky/30 p-6 sm:p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-sky/30 flex items-center justify-center text-teal mx-auto mb-4">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-navy mb-1">Payment processing...</h2>
        <p className="text-xs text-navy/70 max-w-sm mx-auto leading-relaxed">
          Please wait while we verify your payment.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE: PAID / ONBOARDING COMPLETE
  // ----------------------------------------------------
  if (status === "PAID") {
    return (
      <div className="w-full bg-white rounded-3xl border border-emerald-200 p-6 sm:p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-0.5 rounded-full mb-3">
          <CheckCircle className="w-3.5 h-3.5" />
          Onboarding Complete
        </div>

        <h2 className="text-xl font-bold text-navy mb-2">✓ Onboarding Complete</h2>

        <p className="text-xs text-navy/70 mb-6 leading-relaxed max-w-md mx-auto">
          Your payment of <strong>₹{feeInr}</strong> has been verified. Your tutor profile is now active and available to students across Balasore.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {tutorProfileId ? (
            <Link
              href={`/tutors/${tutorProfileId}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm transition-all"
            >
              <span>View Public Profile</span>
              <ExternalLink className="w-3.5 h-3.5 text-teal" />
            </Link>
          ) : (
            <Link
              href="/tutors"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm transition-all"
            >
              <span>View Public Marketplace</span>
              <ExternalLink className="w-3.5 h-3.5 text-teal" />
            </Link>
          )}

          <Link
            href="/tutor/requests"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-semibold text-xs transition-colors"
          >
            <span>Go to Student Requests</span>
            <ArrowRight className="w-3.5 h-3.5 text-teal" />
          </Link>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE: FAILED / CANCELLED RETRY
  // ----------------------------------------------------
  if (status === "FAILED") {
    return (
      <div className="w-full bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-800 bg-rose-100 border border-rose-200 px-3 py-0.5 rounded-full mb-3">
          Payment Pending
        </div>

        <h2 className="text-xl font-bold text-navy mb-2">Payment not completed</h2>

        <p className="text-xs text-navy/70 mb-4 leading-relaxed max-w-md mx-auto">
          Your application is approved, but your onboarding payment is still pending.
        </p>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 text-left">
            {error}
          </div>
        )}

        <button
          onClick={handleStartPayment}
          disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-teal" />
              <span>Opening Checkout...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-teal" />
              <span>Try Again — ₹{feeInr}</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE: APPROVED + UNPAID (DEFAULT)
  // ----------------------------------------------------
  return (
    <div className="w-full bg-white rounded-3xl border border-sky/40 p-6 sm:p-8 text-center shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-sky/30 border border-sky flex items-center justify-center text-teal-dark mx-auto mb-4">
        <Sparkles className="w-7 h-7" />
      </div>

      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-dark bg-sky/30 border border-sky/50 px-3 py-0.5 rounded-full mb-3">
        🎉 Application Approved
      </div>

      <h2 className="text-xl sm:text-2xl font-extrabold text-navy mb-2 tracking-tight">
        🎉 Your application is approved!
      </h2>

      <p className="text-xs text-navy/70 mb-6 max-w-md mx-auto leading-relaxed">
        Your tutor application has been verified and approved. Complete your onboarding by paying the one-time onboarding fee to activate your tutor profile and become visible to students.
      </p>

      {/* Fee Display Banner */}
      <div className="max-w-xs mx-auto mb-6 p-4 rounded-2xl bg-beige-light/70 border border-navy/10 flex items-center justify-between">
        <span className="text-xs font-medium text-navy/70">One-Time Onboarding Fee</span>
        <span className="text-xl font-extrabold text-navy">₹{feeInr}</span>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 text-left">
          {error}
        </div>
      )}

      <button
        onClick={handleStartPayment}
        disabled={loading}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold tracking-wide shadow-sm hover:shadow transition-all disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-teal" />
            <span>Connecting to Gateway...</span>
          </>
        ) : (
          <>
            <span>Complete Onboarding — ₹{feeInr}</span>
            <ArrowRight className="w-4 h-4 text-teal" />
          </>
        )}
      </button>

      <p className="text-[10px] text-navy/50 mt-3">
        Secure payments powered by Razorpay • Instant profile activation
      </p>
    </div>
  );
}
