import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpayClient } from "@/lib/razorpay/client";

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
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { success: false, error: "Missing connectionId parameter." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Fetch connection and verify ownership
    const { data: conn, error: connErr } = await admin
      .from("tutor_connections")
      .select(
        `
        id,
        status,
        payment_status,
        amount,
        currency,
        razorpay_order_id,
        student:students(
          user_id
        ),
        tutor:tutor_profiles(
          display_name
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

    // State check: Cannot create payment order if already unlocked
    if (
      conn.status === "CONTACT_UNLOCKED" ||
      conn.payment_status === "SUCCESS"
    ) {
      return NextResponse.json(
        { success: false, error: "Contact details are already unlocked." },
        { status: 400 }
      );
    }

    // Authoritative Amount: strictly load from DB
    const authoritativeAmount = Number(conn.amount);
    const amountInPaise = Math.round(authoritativeAmount * 100);

    let orderId = conn.razorpay_order_id;

    // Create Razorpay order if not already created
    if (!orderId) {
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const isTestMock = keyId?.startsWith("rzp_test_tutr");

      if (isTestMock) {
        // Deterministic mock test order for local testing
        orderId = `order_test_${conn.id.replace(/-/g, "").substring(0, 14)}`;
      } else {
        const razorpay = getRazorpayClient();
        const rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: conn.currency || "INR",
          receipt: conn.id,
          notes: {
            connection_id: conn.id,
            student_user_id: user.id,
          },
        });
        orderId = rzpOrder.id;
      }

      // Persist order ID to database
      await admin
        .from("tutor_connections")
        .update({ razorpay_order_id: orderId })
        .eq("id", conn.id);
    }

    return NextResponse.json({
      success: true,
      orderId,
      amount: amountInPaise,
      currency: conn.currency || "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      tutorName: conn.tutor?.display_name || "Tutor",
    });
  } catch (err: unknown) {
    console.error("Error creating payment order:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
