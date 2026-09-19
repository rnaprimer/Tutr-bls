import React from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Filter,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Find Verified Tutors in Balasore — Tutr",
  description: "Browse verified local home and private tutors in Balasore, Odisha. Filter by subject, class, board, and locality.",
};

interface PageProps {
  searchParams: Promise<{
    q?: string;
    subject?: string;
    class?: string;
    board?: string;
    locality?: string;
    fee?: string;
  }>;
}

export default async function TutorsMarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q || "").trim().toLowerCase();
  const selectedSubject = params.subject || "";
  const selectedClass = params.class || "";
  const selectedBoard = params.board || "";
  const selectedLocality = params.locality || "";
  const selectedFee = params.fee || "";

  const supabase = await createClient();

  // 1. Fetch reference options for filters
  const [{ data: subjects }, { data: classes }, { data: boards }] =
    await Promise.all([
      supabase.from("subjects").select("id, name, slug").order("name"),
      supabase
        .from("classes")
        .select("id, name, slug, sort_order")
        .order("sort_order"),
      supabase.from("boards").select("id, name, slug").order("name"),
    ]);

  // 2. Query verified tutors from public_tutor_profiles view
  // Strictly enforces is_verified = true
  let query = supabase
    .from("public_tutor_profiles")
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
    .order("created_at", { ascending: false });

  if (selectedLocality) {
    query = query.ilike("locality", `%${selectedLocality}%`);
  }

  const { data: rawTutors, error } = await query;

  if (error) {
    console.error("Error fetching tutors:", error);
  }

  const tutorList = rawTutors || [];
  const tutorIds: string[] = tutorList
    .map((t) => t.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  // 3. Fetch junction details for these tutors
  const tutorSubjectsMap: Record<string, string[]> = {};
  const tutorClassesMap: Record<string, string[]> = {};
  const tutorBoardsMap: Record<string, string[]> = {};

  if (tutorIds.length > 0) {
    const [
      { data: subjectsData },
      { data: classesData },
      { data: boardsData },
    ] = await Promise.all([
      supabase
        .from("tutor_subjects")
        .select("tutor_id, subject:subjects(name, slug)")
        .in("tutor_id", tutorIds),
      supabase
        .from("tutor_classes")
        .select("tutor_id, class:classes(name, slug)")
        .in("tutor_id", tutorIds),
      supabase
        .from("tutor_boards")
        .select("tutor_id, board:boards(name, slug)")
        .in("tutor_id", tutorIds),
    ]);

    subjectsData?.forEach((item) => {
      if (item.subject?.name) {
        if (!tutorSubjectsMap[item.tutor_id]) tutorSubjectsMap[item.tutor_id] = [];
        tutorSubjectsMap[item.tutor_id].push(item.subject.name);
      }
    });

    classesData?.forEach((item) => {
      if (item.class?.name) {
        if (!tutorClassesMap[item.tutor_id]) tutorClassesMap[item.tutor_id] = [];
        tutorClassesMap[item.tutor_id].push(item.class.name);
      }
    });

    boardsData?.forEach((item) => {
      if (item.board?.name) {
        if (!tutorBoardsMap[item.tutor_id]) tutorBoardsMap[item.tutor_id] = [];
        tutorBoardsMap[item.tutor_id].push(item.board.name);
      }
    });
  }

  // 4. Apply client/server-side filters for search text, subject, class, board, fee
  const filteredTutors = tutorList.filter((tutor) => {
    // Text search (name, qualification, locality, bio)
    if (q) {
      const matchName = tutor.display_name?.toLowerCase().includes(q);
      const matchLocality = tutor.locality?.toLowerCase().includes(q);
      const matchQual = tutor.qualification?.toLowerCase().includes(q);
      const matchBio = tutor.bio?.toLowerCase().includes(q);
      const matchAreas = tutor.teaching_areas?.toLowerCase().includes(q);
      if (!matchName && !matchLocality && !matchQual && !matchBio && !matchAreas) {
        return false;
      }
    }

    // Subject filter
    if (selectedSubject) {
      const tutorSubs = tutor.id ? tutorSubjectsMap[tutor.id] || [] : [];
      const hasSubject = tutorSubs.some(
        (s: string) => s.toLowerCase() === selectedSubject.toLowerCase()
      );
      if (!hasSubject && !tutor.teaching_areas?.toLowerCase().includes(selectedSubject.toLowerCase())) {
        return false;
      }
    }

    // Class filter
    if (selectedClass) {
      const tutorClasses = tutor.id ? tutorClassesMap[tutor.id] || [] : [];
      const hasClass = tutorClasses.some(
        (c: string) => c.toLowerCase() === selectedClass.toLowerCase()
      );
      if (!hasClass && !tutor.teaching_areas?.toLowerCase().includes(selectedClass.toLowerCase())) {
        return false;
      }
    }

    // Board filter
    if (selectedBoard) {
      const tutorBoards = tutor.id ? tutorBoardsMap[tutor.id] || [] : [];
      const hasBoard = tutorBoards.some(
        (b: string) => b.toLowerCase() === selectedBoard.toLowerCase()
      );
      if (!hasBoard && !tutor.teaching_areas?.toLowerCase().includes(selectedBoard.toLowerCase())) {
        return false;
      }
    }

    // Fee filter
    if (selectedFee && tutor.fee) {
      const numFee = parseInt(tutor.fee.replace(/[^\d]/g, ""), 10);
      const maxFee = parseInt(selectedFee, 10);
      if (!isNaN(numFee) && !isNaN(maxFee) && numFee > maxFee) {
        return false;
      }
    }

    return true;
  });

  const popularLocalities = [
    "Remuna",
    "OT Road",
    "Sahadevkhunta",
    "Gopalgaon",
    "Kuruda",
    "Station Road",
    "Fakir Mohan Golayei",
    "Balasore Town",
    "Sunhat",
  ];

  const hasActiveFilters = Boolean(
    q ||
      selectedSubject ||
      selectedClass ||
      selectedBoard ||
      selectedLocality ||
      selectedFee
  );

  return (
    <div className="min-h-screen bg-beige-light/30">
      {/* Top Marketplace Navigation */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-navy/10 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
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
              href="/student/requests"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy/80 hover:text-navy px-3.5 py-2 rounded-full border border-navy/15 hover:bg-beige/60 transition-colors"
            >
              <span>My Requests</span>
            </Link>
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-navy hover:bg-navy-dark px-4 py-2 rounded-full transition-colors shadow-sm"
            >
              <span>Student Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Marketplace Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal bg-sky/30 px-3 py-1 rounded-full mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Balasore Educators
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy tracking-tight">
            Find the Right Tutor in Balasore
          </h1>
          <p className="text-sm text-navy/70 mt-2 max-w-xl mx-auto leading-relaxed">
            Browse admin-verified local tutors across Sahadevkhunta, OT Road, Remuna, and Balasore. Filter by subject, class, and fee.
          </p>
        </div>

        {/* Filter Toolbar Form */}
        <div className="bg-white rounded-3xl border border-navy/10 p-5 sm:p-6 shadow-sm mb-10">
          <form method="GET" action="/tutors" className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-5 h-5 text-navy/40 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                defaultValue={params.q || ""}
                placeholder="Search by tutor name, qualification, or locality..."
                className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl border border-navy/15 bg-beige-light/40 text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </div>

            {/* Filter Dropdown Selects */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
              {/* Subject */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy/60 mb-1">
                  Subject
                </label>
                <select
                  name="subject"
                  defaultValue={selectedSubject}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-navy/15 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                >
                  <option value="">All Subjects</option>
                  {subjects?.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy/60 mb-1">
                  Class
                </label>
                <select
                  name="class"
                  defaultValue={selectedClass}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-navy/15 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                >
                  <option value="">All Classes</option>
                  {classes?.map((cls) => (
                    <option key={cls.id} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Board */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy/60 mb-1">
                  Board
                </label>
                <select
                  name="board"
                  defaultValue={selectedBoard}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-navy/15 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                >
                  <option value="">All Boards</option>
                  {boards?.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Locality */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy/60 mb-1">
                  Locality
                </label>
                <select
                  name="locality"
                  defaultValue={selectedLocality}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-navy/15 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                >
                  <option value="">All Balasore</option>
                  {popularLocalities.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Fee */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy/60 mb-1">
                  Max Fee (₹/month)
                </label>
                <select
                  name="fee"
                  defaultValue={selectedFee}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-navy/15 bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                >
                  <option value="">Any Fee</option>
                  <option value="1500">Up to ₹1,500</option>
                  <option value="3000">Up to ₹3,000</option>
                  <option value="5000">Up to ₹5,000</option>
                  <option value="8000">Up to ₹8,000</option>
                </select>
              </div>
            </div>

            {/* Filter Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-navy/60">
                Found{" "}
                <span className="font-bold text-navy">
                  {filteredTutors.length}
                </span>{" "}
                verified tutor{filteredTutors.length === 1 ? "" : "s"}
              </div>

              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Link
                    href="/tutors"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-navy/60 hover:text-navy hover:bg-beige/60 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </Link>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-colors shadow-sm"
                >
                  <Filter className="w-3.5 h-3.5 text-teal" />
                  <span>Apply Filters</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tutor Cards Grid */}
        {filteredTutors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-navy/10 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-sky/30 text-teal flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-navy mb-1">
              No verified tutors match your filters.
            </h2>
            <p className="text-xs text-navy/60 max-w-md mx-auto mb-6">
              Try broadening your search criteria or resetting filters to view all available verified tutors in Balasore.
            </p>
            {hasActiveFilters && (
              <Link
                href="/tutors"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-teal" />
                <span>Clear All Filters</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => {
              const tutorSubs = tutor.id ? tutorSubjectsMap[tutor.id] || [] : [];
              const tutorCls = tutor.id ? tutorClassesMap[tutor.id] || [] : [];
              const tutorBrd = tutor.id ? tutorBoardsMap[tutor.id] || [] : [];

              return (
                <div
                  key={tutor.id}
                  className="bg-white rounded-3xl border border-navy/10 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Name + Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h2 className="text-lg font-bold text-navy hover:text-teal transition-colors">
                          <Link href={`/tutors/${tutor.id}`}>
                            {tutor.display_name}
                          </Link>
                        </h2>
                        <div className="flex items-center gap-1.5 text-xs text-navy/60 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-teal flex-shrink-0" />
                          <span>{tutor.locality || "Balasore"}</span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    </div>

                    {/* Qualifications & Experience */}
                    <div className="space-y-1 mb-4 text-xs text-navy/80">
                      {tutor.qualification && (
                        <p className="font-semibold text-navy">
                          {tutor.qualification}
                        </p>
                      )}
                      {tutor.experience && (
                        <p className="text-navy/60">{tutor.experience}</p>
                      )}
                    </div>

                    {/* Subjects Badges */}
                    {tutorSubs.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-navy/40 block mb-1">
                          Subjects
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {tutorSubs.slice(0, 3).map((sub: string) => (
                            <span
                              key={sub}
                              className="px-2 py-0.5 rounded-md bg-beige-light text-navy text-[11px] font-medium border border-navy/5"
                            >
                              {sub}
                            </span>
                          ))}
                          {tutorSubs.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] text-navy/50 font-medium">
                              +{tutorSubs.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Target Classes & Boards */}
                    <div className="flex items-center gap-3 text-[11px] text-navy/60 mb-4">
                      {tutorCls.length > 0 && (
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-teal" />
                          <span>{tutorCls.slice(0, 2).join(", ")}</span>
                        </div>
                      )}
                      {tutorBrd.length > 0 && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-teal" />
                          <span>{tutorBrd.slice(0, 2).join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing, Availability & Action CTA */}
                  <div className="pt-4 border-t border-navy/10 mt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-navy/40 uppercase block">
                          Fee
                        </span>
                        <span className="font-bold text-navy">
                          {tutor.fee ? `₹${tutor.fee}` : "Contact for fee"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-navy/40 uppercase block">
                          Availability
                        </span>
                        <span className="font-medium text-navy/70 text-[11px]">
                          {tutor.availability || "Flexible"}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/tutors/${tutor.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy-dark transition-colors shadow-sm"
                    >
                      <span>View Profile & Request</span>
                      <ArrowRight className="w-3.5 h-3.5 text-teal" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
