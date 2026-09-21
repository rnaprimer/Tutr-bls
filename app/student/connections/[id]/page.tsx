import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignOutButton } from "@/components/SignOutButton";
import { UnlockContactButton } from "@/components/payment/UnlockContactButton";
import { UnlockedContactsResponse } from "@/lib/razorpay/client";

export const metadata = {
  title: "Connection Details — Tutr Balasore",
  description: "Unlock contact details for your accepted tuition request.",
};

interface ConnectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConnectionDetailPage({ params }: ConnectionPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/student/connections/${id}`);
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!student) {
    redirect("/student");
  }

  const admin = createAdminClient();

  const { data: conn, error } = await admin
    .from("tutor_connections")
    .select(
      `
      id,
      status,
      payment_status,
      amount,
      currency,
      paid_at,
      contact_unlocked_at,
      created_at,
      request:tutor_requests(
        id,
        status,
        message,
        subject:subjects(name),
        class:classes(name)
      ),
      tutor:tutor_profiles(
        id,
        display_name,
        qualification,
        experience,
        locality,
        fee,
        availability
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !conn) {
    notFound();
  }

  // Ownership check
  const { data: checkConn } = await admin
    .from("tutor_connections")
    .select("student_id")
    .eq("id", id)
    .single();

  if (checkConn?.student_id !== student.id) {
    redirect("/student/connections");
  }

  const tutor = conn.tutor;
  const subjectName = conn.request?.subject?.name || "Tuition";
  const className = conn.request?.class?.name || "All Classes";
  const isUnlocked = conn.status === "CONTACT_UNLOCKED";

  let contacts: UnlockedContactsResponse | null = null;
  if (isUnlocked) {
    const { data } = await admin.rpc("get_unlocked_connection_contacts", {
      p_connection_id: conn.id,
    });
    contacts = data as unknown as UnlockedContactsResponse;
  }

  const unlockedTutor = contacts?.tutor;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender">
      {/* Top Header */}
      <header className="w-full bg-white/80 backdrop-blur border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink"
            >
              <span>Tutr</span>
              <span className="font-handwritten text-base px-2.5 py-0.5 rounded-full bg-honey/30 text-ink border border-ink shadow-[1px_1px_0px_#18121E]">
                Balasore
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/connections"
              className="text-xs font-bold text-ink hover:text-warm-coral px-3 py-1.5 rounded-full border-2 border-ink bg-white shadow-[2px_2px_0px_#18121E] transition-colors"
            >
              All Connections
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-6">
          <Link
            href="/student/connections"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/70 hover:text-warm-coral transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-warm-coral" />
            <span>Back to Connections</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
            Connection with {tutor?.display_name}
          </h1>
          <p className="text-xs text-ink/70 font-medium mt-1">
            Request accepted for {subjectName} ({className}).
          </p>
        </div>

        <div className="tutr-card bg-white p-6 sm:p-8 space-y-6">
          {/* Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-canvas-lavender border-2 border-ink shadow-[2px_2px_0px_#18121E]">
            <div className="flex items-center gap-2 text-xs font-black text-ink">
              <CheckCircle2 className="w-4 h-4 text-emerald-800" />
              <span>Your request has been accepted by this educator!</span>
            </div>
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-ink bg-mint-badge/40 px-3 py-1 rounded-full border border-ink shadow-[1px_1px_0px_#18121E]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
                Contact Unlocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-ink bg-honey/30 px-3 py-1 rounded-full border border-ink shadow-[1px_1px_0px_#18121E]">
                <Lock className="w-3.5 h-3.5 text-warm-coral" />
                Contact Locked
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-ink font-medium">
            <div className="p-3.5 rounded-xl bg-canvas-lavender/50 border border-ink/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-ink/50">Subject & Class</span>
              <p className="font-bold text-ink">
                {subjectName} • {className}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-canvas-lavender/50 border border-ink/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-ink/50">Tutor Locality</span>
              <p className="font-bold text-ink">{tutor?.locality || "Balasore"}</p>
            </div>

            {tutor?.fee && (
              <div className="p-3.5 rounded-xl bg-canvas-lavender/50 border border-ink/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-ink/50">Tutor&apos;s Stated Fee</span>
                <p className="font-bold text-ink">₹{tutor.fee} / month</p>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-mint-badge/20 border border-ink/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-ink/50">Tutr Platform Connection Fee</span>
              <p className="font-black text-ink">₹{conn.amount} (One-time)</p>
            </div>
          </div>

          {/* Unlocked Contact Disclosure vs Checkout CTA */}
          {isUnlocked && unlockedTutor ? (
            <div className="p-6 rounded-2xl bg-mint-badge/20 border-2 border-ink space-y-4 shadow-[2px_2px_0px_#18121E]">
              <div className="flex items-center gap-2 text-ink font-black text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-800" />
                <span>Verified Tutor Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {unlockedTutor.phone && (
                  <div className="p-4 bg-white rounded-xl border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                    <span className="text-[10px] uppercase font-bold text-ink/50 block mb-1">
                      Direct Mobile Number
                    </span>
                    <a
                      href={`tel:${unlockedTutor.phone}`}
                      className="font-black text-ink text-base hover:text-warm-coral flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4 text-emerald-800" />
                      <span>{unlockedTutor.phone}</span>
                    </a>
                  </div>
                )}

                {unlockedTutor.email && (
                  <div className="p-4 bg-white rounded-xl border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                    <span className="text-[10px] uppercase font-bold text-ink/50 block mb-1">
                      Direct Email Address
                    </span>
                    <a
                      href={`mailto:${unlockedTutor.email}`}
                      className="font-black text-ink text-base hover:text-warm-coral flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4 text-emerald-800" />
                      <span>{unlockedTutor.email}</span>
                    </a>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-ink/70 font-medium leading-relaxed">
                Connect directly with {tutor?.display_name} to confirm home or batch tuition schedules.
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-canvas-lavender border-2 border-ink space-y-4 shadow-[2px_2px_0px_#18121E]">
              <div className="flex items-center gap-2 text-xs font-black text-ink">
                <Lock className="w-4 h-4 text-warm-coral" />
                <span>Unlock Contact Information</span>
              </div>
              <p className="text-xs text-ink/70 font-medium leading-relaxed">
                To protect our educators and maintain a verified network in Balasore, direct contact information is unlocked upon paying the one-time platform connection fee.
              </p>

              <div className="pt-2 flex justify-end">
                <UnlockContactButton
                  connectionId={conn.id}
                  amount={Number(conn.amount)}
                  currency={conn.currency}
                  tutorName={tutor?.display_name || "Tutor"}
                  isUnlocked={false}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-xs font-bold text-ink/60 border-t-2 border-ink/20 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
