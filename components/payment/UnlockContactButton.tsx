"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

interface UnlockContactButtonProps {
  connectionId: string;
  amount: number;
  currency?: string;
  tutorName: string;
  isUnlocked?: boolean;
}

export function UnlockContactButton({
  connectionId,
  amount,
  currency = "INR",
  tutorName,
  isUnlocked = false,
}: UnlockContactButtonProps) {
  const router = useRouter();
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

  const handleUnlockPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Create Razorpay order via server API
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create payment order.");
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
        currency: orderData.currency || currency,
        name: "Tutr Balasore",
        description: `Contact Unlock for ${tutorName}`,
        order_id: orderData.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setLoading(true);
            // 4. Server-side signature verification & atomic unlock
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                connectionId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(
                verifyData.error || "Payment verification failed."
              );
            }

            // 5. Refresh view to disclose revealed contacts
            router.refresh();
          } catch (err: unknown) {
            console.error("Verification error:", err);
            setError(
              err instanceof Error ? err.message : "Payment verification failed."
            );
          } finally {
            setLoading(false);
          }
        },
        theme: {
          color: "#18121E",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setLoading(false);
        setError(
          response.error?.description ||
            "Payment failed. Please try again."
        );
      });
      rzp.open();
    } catch (err: unknown) {
      console.error("Payment initiation error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initiate payment."
      );
      setLoading(false);
    }
  };

  if (isUnlocked) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-mint-badge/40 text-ink border-2 border-ink text-xs font-black shadow-[2px_2px_0px_#18121E]">
        <ShieldCheck className="w-4 h-4 text-emerald-800" />
        <span>Contact Unlocked</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start sm:items-end gap-1.5">
      <button
        onClick={handleUnlockPayment}
        disabled={loading}
        className="tutr-btn-student py-2.5 px-5 text-xs flex items-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5" />
            <span>Unlock Contact — ₹{amount}</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-[11px] text-rose-700 font-bold flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
