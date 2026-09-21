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
          color: "#18121E",
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
      <div className="w-full tutr-card bg-white p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-accent/20 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-4 shadow-[2px_2px_0px_#18121E]">
          <Loader2 className="w-7 h-7 animate-spin text-warm-coral" />
        </div>
        <h2 className="text-xl font-black text-ink mb-1">Payment processing...</h2>
        <p className="text-xs text-ink/70 font-medium max-w-sm mx-auto leading-relaxed">
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
      <div className="w-full tutr-card bg-white p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-mint-badge/30 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-4 shadow-[2px_2px_0px_#18121E]">
          <CheckCircle className="w-7 h-7 text-emerald-800" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink bg-mint-badge/40 border-2 border-ink px-3 py-0.5 rounded-full mb-3 shadow-[1px_1px_0px_#18121E]">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-800" />
          Onboarding Complete
        </div>

        <h2 className="text-xl font-black text-ink mb-2">✓ Onboarding Complete</h2>

        <p className="text-xs text-ink/70 font-medium mb-6 leading-relaxed max-w-md mx-auto">
          Your payment of <strong className="text-ink">₹{feeInr}</strong> has been verified. Your tutor profile is now active and available to students across Balasore.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {tutorProfileId ? (
            <Link
              href={`/tutors/${tutorProfileId}`}
              className="w-full sm:w-auto tutr-btn-tutor py-2.5 px-6 text-xs inline-flex items-center gap-2"
            >
              <span>View Public Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href="/tutors"
              className="w-full sm:w-auto tutr-btn-tutor py-2.5 px-6 text-xs inline-flex items-center gap-2"
            >
              <span>View Public Marketplace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            href="/tutor/requests"
            className="w-full sm:w-auto px-6 py-2.5 rounded-full border-2 border-ink bg-white font-bold text-ink text-xs hover:bg-gray-50 transition-colors shadow-[2px_2px_0px_#18121E] inline-flex items-center justify-center gap-2"
          >
            <span>Go to Student Requests</span>
            <ArrowRight className="w-3.5 h-3.5 text-warm-coral" />
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
      <div className="w-full tutr-card bg-white p-6 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-4 shadow-[2px_2px_0px_#18121E]">
          <AlertCircle className="w-7 h-7 text-rose-600" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink bg-rose-100 border-2 border-ink px-3 py-0.5 rounded-full mb-3 shadow-[1px_1px_0px_#18121E]">
          Payment Pending
        </div>

        <h2 className="text-xl font-black text-ink mb-2">Payment not completed</h2>

        <p className="text-xs text-ink/70 font-medium mb-4 leading-relaxed max-w-md mx-auto">
          Your application is approved, but your onboarding payment is still pending.
        </p>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-900 font-medium text-left">
            {error}
          </div>
        )}

        <button
          onClick={handleStartPayment}
          disabled={loading}
          className="w-full sm:w-auto tutr-btn-tutor py-3 px-8 text-xs inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Opening Checkout...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
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
    <div className="w-full tutr-card bg-white p-6 sm:p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-honey/20 border-2 border-ink flex items-center justify-center text-ink mx-auto mb-4 shadow-[2px_2px_0px_#18121E]">
        <Sparkles className="w-7 h-7 text-warm-coral" />
      </div>

      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink bg-honey/30 border-2 border-ink px-3 py-0.5 rounded-full mb-3 shadow-[1px_1px_0px_#18121E]">
        🎉 Application Approved
      </div>

      <h2 className="text-xl sm:text-2xl font-black text-ink mb-2 tracking-tight">
        🎉 Your application is approved!
      </h2>

      <p className="text-xs text-ink/70 font-medium mb-6 max-w-md mx-auto leading-relaxed">
        Your tutor application has been verified and approved. Complete your onboarding by paying the one-time onboarding fee to activate your tutor profile and become visible to students.
      </p>

      {/* Fee Display Banner */}
      <div className="max-w-xs mx-auto mb-6 p-4 rounded-2xl bg-canvas-lavender border-2 border-ink flex items-center justify-between shadow-[2px_2px_0px_#18121E]">
        <span className="text-xs font-bold text-ink/70">One-Time Onboarding Fee</span>
        <span className="text-xl font-black text-ink">₹{feeInr}</span>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-4 p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-900 font-medium text-left">
          {error}
        </div>
      )}

      <button
        onClick={handleStartPayment}
        disabled={loading}
        className="w-full sm:w-auto tutr-btn-tutor py-3.5 px-8 text-xs inline-flex items-center justify-center gap-2 tracking-wide disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting to Gateway...</span>
          </>
        ) : (
          <>
            <span>Complete Onboarding — ₹{feeInr}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-[10px] text-ink/50 font-bold mt-3">
        Secure payments powered by Razorpay • Instant profile activation
      </p>
    </div>
  );
}
