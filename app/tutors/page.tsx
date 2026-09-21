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
    <div className="min-h-screen bg-canvas-lavender flex flex-col justify-between">
      {/* Top Marketplace Navigation */}
      <header className="sticky top-0 z-40 w-full bg-canvas-lavender/95 backdrop-blur-md border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink font-sans group"
            >
              <span>Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-ink border-2 border-ink shadow-[1.5px_1.5px_0px_#18121E]">
                <MapPin className="w-3 h-3 text-coral" />
                Balasore
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/student/requests"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle px-3.5 py-2 rounded-full transition-all"
            >
              <span>My Requests</span>
            </Link>
            <Link
              href="/student"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink bg-honey border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-honey-dark px-4 py-2 rounded-full transition-all"
            >
              <span>Student Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Marketplace Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full">
        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] px-3.5 py-1 rounded-full mb-3 rotate-[-1deg]">
            <ShieldCheck className="w-4 h-4 text-mint-dark" />
            Verified Balasore Educators
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight font-sans">
            Find the Right Tutor in Balasore
          </h1>
          <p className="text-sm sm:text-base text-ink-muted mt-2 max-w-xl mx-auto leading-relaxed font-medium">
            Browse verified local home and private tutors across Sahadevkhunta, OT Road, Remuna, and Balasore.
          </p>
        </div>

        {/* Filter Toolbar Form */}
        <div className="bg-white rounded-3xl border-2 border-ink p-5 sm:p-6 shadow-[4px_4px_0px_#18121E] mb-10">
          <form method="GET" action="/tutors" className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-5 h-5 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                defaultValue={params.q || ""}
                placeholder="Search by tutor name, qualification, or locality..."
                className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl border-2 border-ink bg-canvas-subtle text-ink font-medium placeholder:text-ink-light focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>

            {/* Filter Dropdown Selects */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
              {/* Subject */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mb-1">
                  Subject
                </label>
                <select
                  name="subject"
                  defaultValue={selectedSubject}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-ink bg-white text-ink font-bold focus:outline-none focus:ring-2 focus:ring-ink cursor-pointer"
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
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mb-1">
                  Class
                </label>
                <select
                  name="class"
                  defaultValue={selectedClass}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-ink bg-white text-ink font-bold focus:outline-none focus:ring-2 focus:ring-ink cursor-pointer"
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
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mb-1">
                  Board
                </label>
                <select
                  name="board"
                  defaultValue={selectedBoard}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-ink bg-white text-ink font-bold focus:outline-none focus:ring-2 focus:ring-ink cursor-pointer"
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
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mb-1">
                  Locality
                </label>
                <select
                  name="locality"
                  defaultValue={selectedLocality}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-ink bg-white text-ink font-bold focus:outline-none focus:ring-2 focus:ring-ink cursor-pointer"
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
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-muted mb-1">
                  Max Fee (₹/month)
                </label>
                <select
                  name="fee"
                  defaultValue={selectedFee}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-ink bg-white text-ink font-bold focus:outline-none focus:ring-2 focus:ring-ink cursor-pointer"
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
              <div className="text-xs text-ink-muted font-bold">
                Found{" "}
                <span className="text-ink">
                  {filteredTutors.length}
                </span>{" "}
                verified educator{filteredTutors.length === 1 ? "" : "s"}
              </div>

              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Link
                    href="/tutors"
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-ink hover:bg-canvas-subtle rounded-xl border border-ink/30 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-coral" />
                    <span>Reset</span>
                  </Link>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-full bg-coral text-ink text-xs font-bold border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-coral-dark hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5 text-ink" />
                  <span>Apply Filters</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tutor Cards Grid */}
        {filteredTutors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-ink p-8 shadow-[4px_4px_0px_#18121E]">
            <div className="w-16 h-16 rounded-2xl bg-honey-light border-2 border-ink text-ink flex items-center justify-center mx-auto mb-4 text-3xl shadow-[2px_2px_0px_#18121E]">
              🔍
            </div>
            <h2 className="text-xl font-extrabold text-ink mb-2 font-sans">
              No verified tutors match your filters.
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto mb-6 font-medium">
              Try broadening your search criteria or resetting filters to view all available verified tutors in Balasore.
            </p>
            {hasActiveFilters && (
              <Link
                href="/tutors"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-honey text-ink text-xs font-bold border-2 border-ink shadow-[2.5px_2.5px_0px_#18121E] hover:bg-honey-dark transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 text-ink" />
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
                  className="bg-white rounded-3xl border-2 border-ink p-6 shadow-[4px_4px_0px_#18121E] hover:shadow-[6px_6px_0px_#18121E] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Avatar initial + Name + Badge */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-honey-light border-2 border-ink flex items-center justify-center font-extrabold text-ink text-lg shrink-0 shadow-[1.5px_1.5px_0px_#18121E]">
                          {tutor.display_name?.charAt(0).toUpperCase() || "T"}
                        </div>
                        <div>
                          <h2 className="text-lg font-extrabold text-ink hover:text-coral transition-colors font-sans">
                            <Link href={`/tutors/${tutor.id}`}>
                              {tutor.display_name}
                            </Link>
                          </h2>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-coral shrink-0" />
                            <span>{tutor.locality || "Balasore"}</span>
                          </div>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-mint-light text-ink border-2 border-ink shadow-[1px_1px_0px_#18121E]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-mint-dark" />
                        Verified
                      </span>
                    </div>

                    {/* Qualifications & Experience */}
                    <div className="space-y-1 mb-4 text-xs">
                      {tutor.qualification && (
                        <p className="font-bold text-ink">
                          🎓 {tutor.qualification}
                        </p>
                      )}
                      {tutor.experience && (
                        <p className="text-ink-muted font-medium">💼 {tutor.experience}</p>
                      )}
                    </div>

                    {/* Subjects Badges */}
                    {tutorSubs.length > 0 && (
                      <div className="mb-3">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted block mb-1">
                          Subjects
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {tutorSubs.slice(0, 3).map((sub: string) => (
                            <span
                              key={sub}
                              className="px-2.5 py-0.5 rounded-xl bg-purple-light text-ink text-xs font-bold border border-ink/20"
                            >
                              {sub}
                            </span>
                          ))}
                          {tutorSubs.length > 3 && (
                            <span className="px-2 py-0.5 rounded-xl text-[10px] text-ink-muted font-bold bg-canvas-subtle">
                              +{tutorSubs.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Target Classes & Boards */}
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-muted mb-4">
                      {tutorCls.length > 0 && (
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-purple-dark" />
                          <span>{tutorCls.slice(0, 2).join(", ")}</span>
                        </div>
                      )}
                      {tutorBrd.length > 0 && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-coral" />
                          <span>{tutorBrd.slice(0, 2).join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing, Availability & Action CTA */}
                  <div className="pt-4 border-t-2 border-ink/15 mt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-ink-muted font-extrabold uppercase block">
                          Monthly Fee
                        </span>
                        <span className="font-extrabold text-ink text-sm">
                          {tutor.fee ? `₹${tutor.fee}` : "Contact for fee"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-ink-muted font-extrabold uppercase block">
                          Availability
                        </span>
                        <span className="font-bold text-ink-muted text-xs">
                          {tutor.availability || "Flexible"}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/tutors/${tutor.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-honey text-ink text-xs font-bold border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-honey-dark hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                    >
                      <span>View Profile & Request</span>
                      <ArrowRight className="w-3.5 h-3.5 text-ink" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-ink-muted font-medium border-t-2 border-ink bg-canvas-lavender mt-12">
        <p>© {new Date().getFullYear()} Tutr Balasore • Verified Local Educators</p>
      </footer>
    </div>
  );
}
