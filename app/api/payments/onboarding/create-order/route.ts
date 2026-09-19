import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpayClient } from "@/lib/razorpay/client";

export async function POST() {
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

    const admin = createAdminClient();

    // 1. Verify user exists and check role
    const { data: userProfile, error: userErr } = await admin
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (userErr || !userProfile) {
      return NextResponse.json(
        { success: false, error: "User profile not found." },
        { status: 404 }
      );
    }

    // Must not be a student account
    if (userProfile.role === "STUDENT") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Students cannot initiate tutor onboarding payments." },
        { status: 403 }
      );
    }

    // 2. Find tutor's application
    const { data: application, error: appErr } = await admin
      .from("tutor_applications")
      .select("id, status, full_name")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (appErr || !application) {
      return NextResponse.json(
        { success: false, error: "No tutor application found for this account." },
        { status: 404 }
      );
    }

    // Must be in APPROVED status
    if (application.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot pay onboarding fee: Application is ${application.status}. Application must be APPROVED.`,
        },
        { status: 400 }
      );
    }

    // 3. Locate corresponding tutor profile
    const { data: profile } = await admin
      .from("tutor_profiles")
      .select("id, is_active")
      .or(`application_id.eq.${application.id},user_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle();

    // 4. Check if onboarding payment is already PAID
    const { data: existingPaid } = await admin
      .from("tutor_onboarding_payments")
      .select("id, status")
      .eq("application_id", application.id)
      .eq("status", "PAID")
      .maybeSingle();

    if (existingPaid || profile?.is_active) {
      return NextResponse.json(
        { success: false, error: "Tutor onboarding fee has already been paid." },
        { status: 400 }
      );
    }

    // 5. Strict Server Authority for Amount
    const fee = Number(process.env.TUTR_TUTOR_ONBOARDING_FEE_INR || 149);
    if (!Number.isInteger(fee) || fee <= 0) {
      throw new Error("TUTR_TUTOR_ONBOARDING_FEE_INR is not configured correctly");
    }

    const amountInPaise = Math.round(fee * 100);

    // 6. Create or reuse PENDING onboarding payment record
    let paymentRecord;
    const { data: pendingPayment } = await admin
      .from("tutor_onboarding_payments")
      .select("id, razorpay_order_id, amount, status")
      .eq("application_id", application.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingPayment) {
      paymentRecord = pendingPayment;
      // Ensure amount matches authoritative fee
      if (paymentRecord.amount !== fee) {
        await admin
          .from("tutor_onboarding_payments")
          .update({ amount: fee, updated_at: new Date().toISOString() })
          .eq("id", paymentRecord.id);
        paymentRecord.amount = fee;
      }
    } else {
      const { data: newPayment, error: insertErr } = await admin
        .from("tutor_onboarding_payments")
        .insert({
          application_id: application.id,
          tutor_profile_id: profile?.id || null,
          user_id: user.id,
          amount: fee,
          currency: "INR",
          status: "PENDING",
        })
        .select("id, razorpay_order_id, amount, status")
        .single();

      if (insertErr || !newPayment) {
        throw new Error(insertErr?.message || "Failed to create onboarding payment record.");
      }
      paymentRecord = newPayment;
    }

    // 7. Create Razorpay order if not present
    let orderId = paymentRecord.razorpay_order_id;
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const isTestMock = keyId?.startsWith("rzp_test_tutr");

    if (!orderId) {
      if (isTestMock) {
        orderId = `order_onb_${paymentRecord.id.replace(/-/g, "").substring(0, 14)}`;
      } else {
        const razorpay = getRazorpayClient();
        const rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: paymentRecord.id,
          notes: {
            payment_type: "tutor_onboarding",
            application_id: application.id,
            user_id: user.id,
          },
        });
        orderId = rzpOrder.id;
      }

      await admin
        .from("tutor_onboarding_payments")
        .update({ razorpay_order_id: orderId, updated_at: new Date().toISOString() })
        .eq("id", paymentRecord.id);
    }

    return NextResponse.json({
      success: true,
      paymentId: paymentRecord.id,
      orderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    console.error("Error creating tutor onboarding order:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
