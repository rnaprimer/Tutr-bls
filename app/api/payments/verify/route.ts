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
      connectionId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (
      !connectionId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required payment verification parameters (connectionId, razorpay_order_id, razorpay_payment_id, razorpay_signature).",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Fetch connection
    const { data: conn, error: connErr } = await admin
      .from("tutor_connections")
      .select(
        `
        id,
        status,
        payment_status,
        razorpay_order_id,
        student:students(
          user_id
        )
      `
      )
      .eq("id", connectionId)
      .single();

    if (connErr || !conn) {
      return NextResponse.json(
        { success: false, error: "Connection record not found." },
        { status: 404 }
      );
    }

    // Ownership check: Caller must be the student on this connection
    if (conn.student?.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access to this connection." },
        { status: 403 }
      );
    }

    // Order ID consistency check
    if (
      conn.razorpay_order_id &&
      conn.razorpay_order_id !== razorpay_order_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Provided razorpay_order_id does not match the connection record.",
        },
        { status: 400 }
      );
    }

    // Cryptographic signature verification
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

    // Atomically unlock connection via SECURITY DEFINER RPC
    const { data: unlockRes, error: unlockErr } = await admin.rpc(
      "unlock_connection_after_payment",
      {
        p_connection_id: conn.id,
        p_razorpay_order_id: razorpay_order_id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_razorpay_signature: razorpay_signature,
      }
    );

    if (unlockErr) {
      console.error("Error executing unlock_connection_after_payment RPC:", unlockErr);
      return NextResponse.json(
        { success: false, error: unlockErr.message || "Failed to unlock connection." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      unlocked: true,
      data: unlockRes,
    });
  } catch (err: unknown) {
    console.error("Error in /api/payments/verify:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
