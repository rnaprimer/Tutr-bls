import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  MapPin,
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
    <div className="min-h-screen flex flex-col justify-between bg-beige-light/30">
      {/* Top Header */}
      <header className="w-full bg-white/95 border-b border-navy/10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy"
            >
              <span>Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sky/50 text-navy-dark border border-sky">
                <MapPin className="w-3 h-3 text-teal" />
                Balasore
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/connections"
              className="text-xs font-semibold text-navy/70 hover:text-navy px-3 py-1.5 rounded-full hover:bg-beige/60 transition-colors"
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy/60 hover:text-navy transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Connections</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            Connection with {tutor?.display_name}
          </h1>
          <p className="text-xs text-navy/60 mt-1">
            Request accepted for {subjectName} ({className}).
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-navy/10 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-sky/30 border border-sky/40">
            <div className="flex items-center gap-2 text-xs font-bold text-navy">
              <CheckCircle2 className="w-4 h-4 text-teal" />
              <span>Your request has been accepted by this educator.</span>
            </div>
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Contact Unlocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Contact Locked
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-navy/80">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-navy/40">Subject & Class</span>
              <p className="font-semibold text-navy">
                {subjectName} • {className}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-navy/40">Tutor Locality</span>
              <p className="font-semibold text-navy">{tutor?.locality || "Balasore"}</p>
            </div>

            {tutor?.fee && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-navy/40">Tutor&apos;s Stated Fee</span>
                <p className="font-semibold text-navy">₹{tutor.fee} / month</p>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-navy/40">Tutr Platform Connection Fee</span>
              <p className="font-semibold text-emerald-700">₹{conn.amount} (One-time)</p>
            </div>
          </div>

          {/* Unlocked Contact Disclosure vs Checkout CTA */}
          {isUnlocked && unlockedTutor ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span>Verified Tutor Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {unlockedTutor.phone && (
                  <div className="p-4 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-navy/40 block mb-1">
                      Direct Mobile Number
                    </span>
                    <a
                      href={`tel:${unlockedTutor.phone}`}
                      className="font-bold text-navy text-base hover:text-teal flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4 text-emerald-700" />
                      <span>{unlockedTutor.phone}</span>
                    </a>
                  </div>
                )}

                {unlockedTutor.email && (
                  <div className="p-4 bg-white rounded-xl border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-navy/40 block mb-1">
                      Direct Email Address
                    </span>
                    <a
                      href={`mailto:${unlockedTutor.email}`}
                      className="font-bold text-navy text-base hover:text-teal flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4 text-emerald-700" />
                      <span>{unlockedTutor.email}</span>
                    </a>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-navy/60 leading-relaxed">
                Connect directly with {tutor?.display_name} to confirm home or batch tuition schedules.
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-beige-light/70 border border-navy/10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-navy">
                <Lock className="w-4 h-4 text-teal" />
                <span>Unlock Contact Information</span>
              </div>
              <p className="text-xs text-navy/70 leading-relaxed">
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

      <footer className="text-center py-6 text-xs text-navy/50 border-t border-navy/10 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr • Hyperlocal tutoring in Balasore, Odisha.</p>
      </footer>
    </div>
  );
}
