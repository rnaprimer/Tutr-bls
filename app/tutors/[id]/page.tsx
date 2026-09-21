import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  BookOpen,
  Calendar,
  GraduationCap,
  IndianRupee,
  Briefcase,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TutorProfileClient } from "./TutorProfileClient";
import type { OptionItem } from "./RequestTutorModal";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tutor } = await supabase
    .from("public_tutor_profiles")
    .select("display_name, locality")
    .eq("id", id)
    .maybeSingle();

  if (!tutor) {
    return {
      title: "Tutor Not Found — Tutr Balasore",
    };
  }

  return {
    title: `${tutor.display_name} — Verified Tutor in ${tutor.locality || "Balasore"} | Tutr`,
    description: `View public tutoring profile for ${tutor.display_name} in ${tutor.locality || "Balasore"}, Odisha. Verified educator on Tutr.`,
  };
}

export default async function TutorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Verify tutor is eligible for public discovery:
  // Must satisfy is_verified = true, is_active = true, application APPROVED, and onboarding payment PAID
  const { data: publicCheck } = await supabase
    .from("public_tutor_profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!publicCheck) {
    notFound();
  }

  // 2. Fetch full public profile
  const { data: tutor, error: tutorError } = await supabase
    .from("tutor_profiles")
    .select(
      `
      id,
      display_name,
      photo_url,
      bio,
      qualification,
      experience,
      locality,
      teaching_areas,
      fee,
      availability,
      is_verified,
      created_at
    `
    )
    .eq("id", id)
    .eq("is_verified", true)
    .eq("is_active", true)
    .single();

  if (tutorError || !tutor) {
    notFound();
  }

  // 2. Fetch associated subjects, classes, boards strictly for this tutor
  const [
    { data: tutorSubjects },
    { data: tutorClasses },
    { data: tutorBoards },
  ] = await Promise.all([
    supabase
      .from("tutor_subjects")
      .select("subject:subjects(id, name, slug)")
      .eq("tutor_id", id),
    supabase
      .from("tutor_classes")
      .select("class:classes(id, name, slug, sort_order)")
      .eq("tutor_id", id),
    supabase
      .from("tutor_boards")
      .select("board:boards(id, name, slug)")
      .eq("tutor_id", id),
  ]);

  // Extract option items strictly belonging to this tutor
  const subjectsList: OptionItem[] = (tutorSubjects || [])
    .map((ts) => ts.subject)
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => ({ id: s.id, name: s.name }));

  const classesList: OptionItem[] = (tutorClasses || [])
    .map((tc) => tc.class)
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ id: c.id, name: c.name }));

  const boardsList: string[] = (tutorBoards || [])
    .map((tb) => tb.board?.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);

  // 3. User session check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-canvas-lavender pb-20">
      {/* Top Breadcrumb Header */}
      <header className="w-full bg-white/80 backdrop-blur border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/tutors"
            className="inline-flex items-center gap-2 text-xs font-bold text-ink hover:text-warm-coral transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-warm-coral" />
            <span>Back to All Tutors</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-black tracking-tight text-ink"
          >
            <span>Tutr</span>
            <span className="font-handwritten text-base px-2.5 py-0.5 rounded-full bg-honey/30 text-ink border border-ink shadow-[1px_1px_0px_#18121E]">
              Balasore
            </span>
          </Link>
        </div>
      </header>

      {/* Main Profile Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="tutr-card bg-white p-0 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-ink text-white p-6 sm:p-10 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-warm-coral border-2 border-white flex items-center justify-center text-white text-3xl font-black flex-shrink-0 shadow-[3px_3px_0px_rgba(255,255,255,0.3)]">
                  {tutor.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-badge text-ink text-xs font-bold border border-ink mb-2 shadow-[2px_2px_0px_#18121E]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Verified Educator</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    {tutor.display_name}
                  </h1>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-white/80 mt-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-warm-coral" />
                    <span>{tutor.locality || "Balasore, Odisha"}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="sm:self-center">
                <TutorProfileClient
                  tutorId={tutor.id}
                  tutorName={tutor.display_name}
                  subjects={subjectsList}
                  classes={classesList}
                  isAuthenticated={!!user}
                />
              </div>
            </div>
          </div>

          {/* Body Content Sections */}
          <div className="p-6 sm:p-10 space-y-8 bg-white">
            {/* Bio / Overview */}
            {tutor.bio && (
              <div className="p-5 rounded-2xl bg-canvas-lavender border-2 border-ink/40 shadow-[2px_2px_0px_rgba(24,18,30,0.1)]">
                <h2 className="text-xs font-black uppercase tracking-wider text-ink/60 mb-2">
                  About the Tutor
                </h2>
                <p className="text-sm text-ink leading-relaxed font-medium">
                  {tutor.bio}
                </p>
              </div>
            )}

            {/* Teaching Information: Subjects, Classes, Boards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-warm-coral/10 border-2 border-ink shadow-[3px_3px_0px_#18121E]">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-ink mb-3">
                  <BookOpen className="w-4 h-4 text-warm-coral" />
                  <span>Subjects</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {subjectsList.length > 0 ? (
                    subjectsList.map((sub) => (
                      <span
                        key={sub.id}
                        className="inline-block px-3 py-1 rounded-full bg-white border-2 border-ink text-xs font-bold text-ink shadow-[1px_1px_0px_#18121E]"
                      >
                        {sub.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink/50">Not specified</span>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-honey/20 border-2 border-ink shadow-[3px_3px_0px_#18121E]">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-ink mb-3">
                  <GraduationCap className="w-4 h-4 text-warm-coral" />
                  <span>Target Classes</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {classesList.length > 0 ? (
                    classesList.map((cls) => (
                      <span
                        key={cls.id}
                        className="inline-block px-3 py-1 rounded-full bg-white border-2 border-ink text-xs font-bold text-ink shadow-[1px_1px_0px_#18121E]"
                      >
                        {cls.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink/50">Not specified</span>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-purple-accent/20 border-2 border-ink shadow-[3px_3px_0px_#18121E]">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-ink mb-3">
                  <Briefcase className="w-4 h-4 text-warm-coral" />
                  <span>Target Boards</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {boardsList.length > 0 ? (
                    boardsList.map((board) => (
                      <span
                        key={board}
                        className="inline-block px-3 py-1 rounded-full bg-white border-2 border-ink text-xs font-bold text-ink shadow-[1px_1px_0px_#18121E]"
                      >
                        {board}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink/50">Not specified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Qualifications & Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t-2 border-ink/10 pt-6">
              <div className="p-4 rounded-2xl bg-canvas-lavender border-2 border-ink/20 space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-ink/60 block">
                  Educational Qualification
                </span>
                <p className="text-sm font-bold text-ink">
                  {tutor.qualification || "Verified Degree / Credentials"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-canvas-lavender border-2 border-ink/20 space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-ink/60 block">
                  Teaching Experience
                </span>
                <p className="text-sm font-bold text-ink">
                  {tutor.experience || "Experienced local educator"}
                </p>
              </div>
            </div>

            {/* Pricing & Availability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t-2 border-ink/10 pt-6">
              <div className="p-4 rounded-2xl bg-mint-badge/20 border-2 border-ink flex items-start gap-3 shadow-[2px_2px_0px_#18121E]">
                <div className="w-10 h-10 rounded-xl bg-mint-badge border-2 border-ink text-ink flex items-center justify-center flex-shrink-0">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-ink/70 block">
                    Expected Fee
                  </span>
                  <p className="text-base font-black text-ink mt-0.5">
                    {tutor.fee ? `₹${tutor.fee}` : "Contact for fees"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-honey/20 border-2 border-ink flex items-start gap-3 shadow-[2px_2px_0px_#18121E]">
                <div className="w-10 h-10 rounded-xl bg-honey border-2 border-ink text-ink flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-ink/70 block">
                    Weekly Availability
                  </span>
                  <p className="text-sm font-bold text-ink mt-0.5">
                    {tutor.availability || "Flexible / Evening batches"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom CTA Block */}
            <div className="p-6 rounded-3xl bg-warm-coral/15 border-2 border-ink flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[3px_3px_0px_#18121E]">
              <div>
                <h3 className="text-base font-black text-ink">
                  Ready to learn with {tutor.display_name}?
                </h3>
                <p className="text-xs text-ink/70 font-medium">
                  Submit a request with your subject and class to check availability.
                </p>
              </div>

              <TutorProfileClient
                tutorId={tutor.id}
                tutorName={tutor.display_name}
                subjects={subjectsList}
                classes={classesList}
                isAuthenticated={!!user}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
