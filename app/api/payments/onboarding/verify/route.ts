import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentSignature } from "@/lib/razorpay/client";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      paymentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (
      !paymentId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required payment verification parameters (paymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature).",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Fetch onboarding payment record
    const { data: paymentRecord, error: payErr } = await admin
      .from("tutor_onboarding_payments")
      .select("id, user_id, application_id, tutor_profile_id, status, razorpay_order_id")
      .eq("id", paymentId)
      .single();

    if (payErr || !paymentRecord) {
      return NextResponse.json(
        { success: false, error: "Onboarding payment record not found." },
        { status: 404 }
      );
    }

    // 2. Ownership check: Must belong to authenticated user
    if (paymentRecord.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access to this payment record." },
        { status: 403 }
      );
    }

    // 3. Order ID consistency check
    if (
      paymentRecord.razorpay_order_id &&
      paymentRecord.razorpay_order_id !== razorpay_order_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Provided razorpay_order_id does not match the payment record.",
        },
        { status: 400 }
      );
    }

    // 4. Cryptographic HMAC-SHA256 verification with timing-safe comparison
    const isValidSignature = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Razorpay payment signature. Payment verification failed.",
        },
        { status: 400 }
      );
    }

    // 5. Execute atomic RPC via trusted admin client
    const { data: completeRes, error: rpcErr } = await admin.rpc(
      "complete_tutor_onboarding_payment",
      {
        p_payment_id: paymentRecord.id,
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_razorpay_signature: razorpay_signature,
      }
    );

    if (rpcErr) {
      console.error("Error executing complete_tutor_onboarding_payment RPC:", rpcErr);
      return NextResponse.json(
        { success: false, error: rpcErr.message || "Failed to complete onboarding payment." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paid: true,
      active: true,
      data: completeRes,
    });
  } catch (err: unknown) {
    console.error("Error in /api/payments/onboarding/verify:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
