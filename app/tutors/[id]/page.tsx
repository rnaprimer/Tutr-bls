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
    .from("tutor_profiles")
    .select("display_name, locality")
    .eq("id", id)
    .eq("is_verified", true)
    .single();

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

  // 1. Fetch public profile strictly filtered by is_verified = true
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
    .single();

  if (tutorError || !tutor) {
    notFound();
  }

  // 2. Fetch associated subjects, classes, boards
  const [
    { data: tutorSubjects },
    { data: tutorClasses },
    { data: tutorBoards },
    { data: allSubjects },
    { data: allClasses },
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
    supabase.from("subjects").select("id, name").order("name"),
    supabase.from("classes").select("id, name, sort_order").order("sort_order"),
  ]);

  // Extract option items
  const subjectsList: OptionItem[] =
    tutorSubjects && tutorSubjects.length > 0
      ? (tutorSubjects
          .map((ts) => ts.subject)
          .filter(Boolean) as OptionItem[])
      : (allSubjects || []);

  const classesList: OptionItem[] =
    tutorClasses && tutorClasses.length > 0
      ? (tutorClasses
          .map((tc) => tc.class)
          .filter(Boolean) as OptionItem[])
      : (allClasses || []);

  const boardsList =
    tutorBoards
      ?.map((tb) => tb.board?.name)
      .filter(Boolean) || [];

  // 3. User session check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-beige-light/30 pb-20">
      {/* Top Breadcrumb Header */}
      <header className="w-full bg-white border-b border-navy/10 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/tutors"
            className="inline-flex items-center gap-2 text-xs font-semibold text-navy/70 hover:text-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-teal" />
            <span>Back to All Tutors</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-navy"
          >
            <span>Tutr</span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky/50 text-navy-dark border border-sky">
              Balasore
            </span>
          </Link>
        </div>
      </header>

      {/* Main Profile Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="bg-white rounded-3xl border border-navy/10 shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-navy via-navy-light to-navy p-6 sm:p-10 text-white relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-light text-2xl font-bold flex-shrink-0 shadow-inner">
                  {tutor.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal/20 text-teal-light text-xs font-bold border border-teal/30 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Educator</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {tutor.display_name}
                  </h1>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-white/80 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-teal" />
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
          <div className="p-6 sm:p-10 space-y-8">
            {/* Bio / Overview */}
            {tutor.bio && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-navy/50 mb-2">
                  About the Tutor
                </h2>
                <p className="text-sm text-navy/80 leading-relaxed">
                  {tutor.bio}
                </p>
              </div>
            )}

            {/* Teaching Information: Subjects, Classes, Boards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-beige-light/60 border border-navy/5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-dark mb-3">
                  <BookOpen className="w-4 h-4 text-teal" />
                  <span>Subjects</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {subjectsList.length > 0 ? (
                    subjectsList.map((sub) => (
                      <span
                        key={sub.id}
                        className="inline-block px-2.5 py-1 rounded-lg bg-white border border-navy/10 text-xs font-medium text-navy"
                      >
                        {sub.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-navy/50">All Balasore subjects</span>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-beige-light/60 border border-navy/5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-dark mb-3">
                  <GraduationCap className="w-4 h-4 text-teal" />
                  <span>Target Classes</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {classesList.length > 0 ? (
                    classesList.map((cls) => (
                      <span
                        key={cls.id}
                        className="inline-block px-2.5 py-1 rounded-lg bg-white border border-navy/10 text-xs font-medium text-navy"
                      >
                        {cls.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-navy/50">Classes 1 - 12</span>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-beige-light/60 border border-navy/5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-dark mb-3">
                  <Briefcase className="w-4 h-4 text-teal" />
                  <span>Target Boards</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {boardsList.length > 0 ? (
                    boardsList.map((board) => (
                      <span
                        key={board}
                        className="inline-block px-2.5 py-1 rounded-lg bg-white border border-navy/10 text-xs font-medium text-navy"
                      >
                        {board}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-navy/50">BSE, CBSE, ICSE</span>
                  )}
                </div>
              </div>
            </div>

            {/* Qualifications & Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-navy/10 pt-6">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-navy/50 block">
                  Educational Qualification
                </span>
                <p className="text-sm font-semibold text-navy">
                  {tutor.qualification || "Verified Degree / Credentials"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-navy/50 block">
                  Teaching Experience
                </span>
                <p className="text-sm font-semibold text-navy">
                  {tutor.experience || "Experienced local educator"}
                </p>
              </div>
            </div>

            {/* Pricing & Availability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-navy/10 pt-6">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block">
                    Expected Fee
                  </span>
                  <p className="text-sm font-bold text-emerald-950 mt-0.5">
                    {tutor.fee ? `₹${tutor.fee}` : "Contact for fees"}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-sky/30 border border-sky flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky/60 text-navy flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-navy-dark block">
                    Weekly Availability
                  </span>
                  <p className="text-sm font-semibold text-navy mt-0.5">
                    {tutor.availability || "Flexible / Evening batches"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom CTA Block */}
            <div className="p-6 rounded-2xl bg-beige-light/80 border border-navy/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-navy">
                  Ready to learn with {tutor.display_name}?
                </h3>
                <p className="text-xs text-navy/60">
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
