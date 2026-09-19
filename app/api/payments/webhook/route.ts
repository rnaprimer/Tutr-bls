import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay/client";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Missing x-razorpay-signature header." },
        { status: 400 }
      );
    }

    // Cryptographic webhook signature verification
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("Invalid Razorpay webhook signature received.");
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id || `pay_${Date.now()}`;
    const connectionIdFromNotes =
      paymentEntity?.notes?.connection_id || orderEntity?.notes?.connection_id;

    if (!orderId && !connectionIdFromNotes) {
      // Not a payment/order event relevant to connection reconciliation
      return NextResponse.json({ status: "ignored", event });
    }

    if (
      event === "payment.captured" ||
      event === "order.paid" ||
      event === "payment.authorized"
    ) {
      const admin = createAdminClient();

      // Find target connection either by razorpay_order_id or connectionId from notes
      let query = admin.from("tutor_connections").select("id, status");
      if (orderId) {
        query = query.eq("razorpay_order_id", orderId);
      } else if (connectionIdFromNotes) {
        query = query.eq("id", connectionIdFromNotes);
      }

      const { data: conn } = await query.maybeSingle();

      if (conn) {
        // Idempotent unlock
        await admin.rpc("unlock_connection_after_payment", {
          p_connection_id: conn.id,
          p_razorpay_order_id: orderId || null,
          p_razorpay_payment_id: paymentId,
          p_razorpay_signature: signature,
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    console.error("Error processing Razorpay webhook:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
