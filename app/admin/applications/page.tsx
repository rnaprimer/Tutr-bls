import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MapPin,
  User,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { verifyAdminSession } from "@/lib/auth/admin";
import { SignOutButton } from "@/components/SignOutButton";
import { TutrLogo } from "@/components/TutrIllustrations";

export const metadata = {
  title: "Tutor Application Queue — Tutr Admin",
  description: "Review, verify, and approve prospective tutor applications for Balasore.",
};

interface ApplicationsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

const VALID_STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"] as const;
type ApplicationStatus = (typeof VALID_STATUSES)[number];

const PAGE_SIZE = 20;

export default async function ApplicationsQueuePage({
  searchParams,
}: ApplicationsPageProps) {
  const { isAuthenticated, isAdmin, user, profile } = await verifyAdminSession();

  if (!isAuthenticated) {
    redirect("/login?next=/admin/applications");
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender/40 font-sans">
        <header className="w-full bg-white border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <TutrLogo className="w-8 h-8" />
              <span className="font-extrabold text-2xl tracking-tight text-ink">Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-warm-coral/15 text-ink border border-ink">
                <MapPin className="w-3 h-3 text-warm-coral" />
                Balasore
              </span>
            </Link>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-3xl border-2 border-ink p-8 shadow-[4px_4px_0px_#18121E] text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-ink flex items-center justify-center text-rose-600 mx-auto mb-6 shadow-[2px_2px_0px_#18121E]">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-ink mb-2">Access Denied</h1>
            <p className="text-xs text-ink/70 mb-6 leading-relaxed">
              You are signed in as <strong>{user?.email}</strong>, but this account does not have administrator privileges to view tutor applications.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border-2 border-ink hover:bg-canvas-lavender text-ink font-bold text-xs shadow-[2px_2px_0px_#18121E] transition-transform active:translate-y-0.5"
            >
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const params = await searchParams;
  const rawStatus = (params.status || "").toUpperCase();
  const activeStatus: ApplicationStatus | "ALL" = VALID_STATUSES.includes(
    rawStatus as ApplicationStatus
  )
    ? (rawStatus as ApplicationStatus)
    : "ALL";

  const searchQuery = (params.q || "").trim();
  const pageNum = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  // 1. Fetch counts for dashboard status cards
  const [
    { count: totalCount },
    { count: pendingCount },
    { count: underReviewCount },
    { count: approvedCount },
    { count: rejectedCount },
  ] = await Promise.all([
    supabase.from("tutor_applications").select("*", { count: "exact", head: true }),
    supabase.from("tutor_applications").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
    supabase.from("tutor_applications").select("*", { count: "exact", head: true }).eq("status", "UNDER_REVIEW"),
    supabase.from("tutor_applications").select("*", { count: "exact", head: true }).eq("status", "APPROVED"),
    supabase.from("tutor_applications").select("*", { count: "exact", head: true }).eq("status", "REJECTED"),
  ]);

  // 2. Build filtered application query
  let query = supabase
    .from("tutor_applications")
    .select(
      "id, google_response_id, full_name, email, phone, location, status, submitted_at, reviewed_at, reviewed_by, subjects, classes, qualification",
      { count: "exact" }
    )
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (activeStatus !== "ALL") {
    query = query.eq("status", activeStatus);
  }

  if (searchQuery) {
    query = query.or(
      `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,google_response_id.ilike.%${searchQuery}%`
    );
  }

  const { data: applications, count: filteredTotal } = await query;
  const totalFiltered = filteredTotal || 0;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;

  // Fetch onboarding payments for visible applications
  const appIds = (applications || []).map((a) => a.id);
  const { data: onboardingPayments } = appIds.length > 0
    ? await supabase
        .from("tutor_onboarding_payments")
        .select("application_id, status, amount")
        .in("application_id", appIds)
    : { data: [] };

  const paymentMap = new Map<string, string>();
  (onboardingPayments || []).forEach((p) => {
    if (p.status === "PAID" || !paymentMap.has(p.application_id)) {
      paymentMap.set(p.application_id, p.status);
    }
  });

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender/30 font-sans">
      {/* Top Navbar */}
      <header className="w-full bg-white border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <TutrLogo className="w-7 h-7" />
              <span className="text-2xl font-extrabold tracking-tight text-ink">Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-warm-coral/15 text-ink border border-ink">
                <MapPin className="w-3 h-3 text-warm-coral" />
                Balasore
              </span>
            </Link>
            <span className="text-xs font-mono text-ink/40">/</span>
            <Link
              href="/admin"
              className="text-xs font-bold text-ink/70 hover:text-ink transition-colors"
            >
              Admin
            </Link>
            <span className="text-xs font-mono text-ink/40">/</span>
            <span className="text-xs font-bold text-warm-coral">Applications</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-ink/70">
              <User className="w-3.5 h-3.5 text-warm-coral" />
              <span>{profile?.full_name || user?.email}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink bg-soft-purple/40 border border-ink px-3 py-1 rounded-full mb-2">
              <GraduationCap className="w-3.5 h-3.5 text-warm-coral" />
              Tutor Ingestion Pipeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Tutor Application Queue
            </h1>
            <p className="text-xs text-ink/70 mt-1">
              Live intake from Google Forms & Apps Script. Review qualifications, credentials, and approve verified profiles.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-ink bg-white hover:bg-canvas-lavender text-ink text-xs font-bold transition-transform active:translate-y-0.5 shadow-[2px_2px_0px_#18121E] self-start sm:self-auto"
          >
            <span>Admin Overview</span>
          </Link>
        </div>

        {/* Status Counts Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <Link
            href="/admin/applications"
            className={`p-4 rounded-2xl border-2 border-ink transition-all ${
              activeStatus === "ALL"
                ? "bg-ink text-white shadow-[4px_4px_0px_#F28F85]"
                : "bg-white text-ink hover:-translate-y-0.5 shadow-[2px_2px_0px_#18121E]"
            }`}
          >
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wider">All Applications</div>
            <div className="text-2xl font-black mt-1">{totalCount || 0}</div>
          </Link>

          <Link
            href="/admin/applications?status=PENDING"
            className={`p-4 rounded-2xl border-2 border-ink transition-all ${
              activeStatus === "PENDING"
                ? "bg-warm-honey text-ink shadow-[4px_4px_0px_#18121E]"
                : "bg-white text-ink hover:-translate-y-0.5 shadow-[2px_2px_0px_#18121E]"
            }`}
          >
            <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-700" />
              Pending
            </div>
            <div className="text-2xl font-black mt-1 text-ink">{pendingCount || 0}</div>
          </Link>

          <Link
            href="/admin/applications?status=UNDER_REVIEW"
            className={`p-4 rounded-2xl border-2 border-ink transition-all ${
              activeStatus === "UNDER_REVIEW"
                ? "bg-soft-purple text-ink shadow-[4px_4px_0px_#18121E]"
                : "bg-white text-ink hover:-translate-y-0.5 shadow-[2px_2px_0px_#18121E]"
            }`}
          >
            <div className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
              <Play className="w-3 h-3 fill-current text-purple-700" />
              Under Review
            </div>
            <div className="text-2xl font-black mt-1 text-ink">{underReviewCount || 0}</div>
          </Link>

          <Link
            href="/admin/applications?status=APPROVED"
            className={`p-4 rounded-2xl border-2 border-ink transition-all ${
              activeStatus === "APPROVED"
                ? "bg-mint text-ink shadow-[4px_4px_0px_#18121E]"
                : "bg-white text-ink hover:-translate-y-0.5 shadow-[2px_2px_0px_#18121E]"
            }`}
          >
            <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-700" />
              Approved
            </div>
            <div className="text-2xl font-black mt-1 text-ink">{approvedCount || 0}</div>
          </Link>

          <Link
            href="/admin/applications?status=REJECTED"
            className={`p-4 rounded-2xl border-2 border-ink transition-all col-span-2 sm:col-span-1 ${
              activeStatus === "REJECTED"
                ? "bg-rose-500 text-white shadow-[4px_4px_0px_#18121E]"
                : "bg-white text-ink hover:-translate-y-0.5 shadow-[2px_2px_0px_#18121E]"
            }`}
          >
            <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              activeStatus === "REJECTED" ? "text-white" : "text-rose-700"
            }`}>
              <XCircle className="w-3 h-3" />
              Rejected
            </div>
            <div className="text-2xl font-black mt-1">{rejectedCount || 0}</div>
          </Link>
        </div>

        {/* Search & Status Filters Bar */}
        <div className="bg-white rounded-3xl border-2 border-ink p-4 shadow-[3px_3px_0px_#18121E] space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input Form */}
            <form method="GET" className="relative flex-1 w-full">
              {activeStatus !== "ALL" && (
                <input type="hidden" name="status" value={activeStatus} />
              )}
              <Search className="w-4 h-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search by applicant name, email, or Google response ID..."
                className="w-full pl-9 pr-4 py-2.5 rounded-full border-2 border-ink text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-warm-coral/40"
              />
            </form>

            {/* Quick Status Select */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <Link
                href={`/admin/applications${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border border-ink transition-colors ${
                  activeStatus === "ALL" ? "bg-ink text-white" : "bg-white text-ink/70 hover:bg-canvas-lavender"
                }`}
              >
                All
              </Link>
              <Link
                href={`/admin/applications?status=PENDING${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border border-ink transition-colors ${
                  activeStatus === "PENDING" ? "bg-warm-honey text-ink" : "bg-white text-ink/70 hover:bg-canvas-lavender"
                }`}
              >
                Pending
              </Link>
              <Link
                href={`/admin/applications?status=UNDER_REVIEW${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border border-ink transition-colors ${
                  activeStatus === "UNDER_REVIEW" ? "bg-soft-purple text-ink" : "bg-white text-ink/70 hover:bg-canvas-lavender"
                }`}
              >
                Under Review
              </Link>
              <Link
                href={`/admin/applications?status=APPROVED${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border border-ink transition-colors ${
                  activeStatus === "APPROVED" ? "bg-mint text-ink" : "bg-white text-ink/70 hover:bg-canvas-lavender"
                }`}
              >
                Approved
              </Link>
              <Link
                href={`/admin/applications?status=REJECTED${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border border-ink transition-colors ${
                  activeStatus === "REJECTED" ? "bg-rose-500 text-white" : "bg-white text-ink/70 hover:bg-canvas-lavender"
                }`}
              >
                Rejected
              </Link>
            </div>
          </div>

          {searchQuery && (
            <div className="flex items-center justify-between text-xs text-ink/60 px-2">
              <span>
                Filtered by search: <strong>&ldquo;{searchQuery}&rdquo;</strong> ({totalFiltered} results)
              </span>
              <Link
                href={`/admin/applications${activeStatus !== "ALL" ? `?status=${activeStatus}` : ""}`}
                className="text-warm-coral hover:underline font-bold"
              >
                Clear search
              </Link>
            </div>
          )}
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-3xl border-2 border-ink overflow-hidden shadow-[4px_4px_0px_#18121E]">
          {applications && applications.length > 0 ? (
            <div className="divide-y-2 divide-ink/10">
              {applications.map((app) => {
                const subList: string[] = Array.isArray(app.subjects) ? (app.subjects as string[]) : [];
                const classList: string[] = Array.isArray(app.classes) ? (app.classes as string[]) : [];

                return (
                  <div
                    key={app.id}
                    className="p-4 sm:p-6 hover:bg-canvas-lavender/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-extrabold text-ink truncate">
                          {app.full_name}
                        </h3>

                        {app.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-warm-honey text-ink border border-ink">
                            <Clock className="w-3 h-3" />
                            PENDING
                          </span>
                        )}
                        {app.status === "UNDER_REVIEW" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-soft-purple text-ink border border-ink">
                            <Play className="w-3 h-3 fill-current" />
                            UNDER REVIEW
                          </span>
                        )}
                        {app.status === "APPROVED" && (
                          <>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-mint text-ink border border-ink">
                              <CheckCircle className="w-3 h-3" />
                              APPROVED
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-ink ${
                                paymentMap.get(app.id) === "PAID"
                                  ? "bg-mint text-ink"
                                  : "bg-warm-honey text-ink"
                              }`}
                            >
                              Fee: {paymentMap.get(app.id) === "PAID" ? "PAID (₹149)" : "UNPAID"}
                            </span>
                          </>
                        )}
                        {app.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-ink">
                            <XCircle className="w-3 h-3" />
                            REJECTED
                          </span>
                        )}

                        {app.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink/70">
                            <MapPin className="w-3 h-3 text-warm-coral" />
                            {app.location}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-ink/70 flex-wrap">
                        <span>{app.email}</span>
                        {app.phone && (
                          <>
                            <span>•</span>
                            <span>{app.phone}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(app.submitted_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>

                      {/* Qualification snippet */}
                      {app.qualification && (
                        <p className="text-xs text-ink/80 line-clamp-1">
                          <span className="font-bold text-ink">Qualification: </span>
                          {app.qualification}
                        </p>
                      )}

                      {/* Subjects & Classes Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {subList.slice(0, 4).map((sub, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-canvas-lavender text-ink border border-ink"
                          >
                            {sub}
                          </span>
                        ))}
                        {subList.length > 4 && (
                          <span className="text-[10px] text-ink/50 font-mono">
                            +{subList.length - 4} more
                          </span>
                        )}

                        {classList.length > 0 && (
                          <span className="text-[10px] text-ink/60 font-mono ml-2">
                            Classes: {classList.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-warm-coral hover:bg-warm-coral/90 text-ink border-2 border-ink text-xs font-bold transition-transform active:translate-y-0.5 shadow-[2px_2px_0px_#18121E]"
                      >
                        <span>Review Dossier</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-canvas-lavender border-2 border-ink flex items-center justify-center text-ink/50 mx-auto shadow-[2px_2px_0px_#18121E]">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-ink">No Applications Found</h3>
              <p className="text-xs text-ink/60 max-w-sm mx-auto">
                {searchQuery
                  ? "No tutor applications match your search query."
                  : activeStatus !== "ALL"
                  ? `There are currently zero applications with status '${activeStatus}'.`
                  : "No tutor applications have been ingested yet from Google Forms."}
              </p>
              {(searchQuery || activeStatus !== "ALL") && (
                <Link
                  href="/admin/applications"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-warm-coral hover:underline pt-2"
                >
                  View all applications
                </Link>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-canvas-lavender/40 border-t-2 border-ink flex items-center justify-between text-xs text-ink/80 font-bold">
              <div>
                Showing <strong>{from + 1}</strong>–<strong>{Math.min(to + 1, totalFiltered)}</strong> of <strong>{totalFiltered}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/applications?page=${pageNum - 1}${activeStatus !== "ALL" ? `&status=${activeStatus}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                  aria-disabled={pageNum <= 1}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-ink text-xs font-bold transition-all ${
                    pageNum <= 1 ? "opacity-40 pointer-events-none" : "bg-white hover:bg-canvas-lavender text-ink shadow-[2px_2px_0px_#18121E]"
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </Link>

                <span className="px-2 font-mono text-xs">
                  Page {pageNum} of {totalPages}
                </span>

                <Link
                  href={`/admin/applications?page=${pageNum + 1}${activeStatus !== "ALL" ? `&status=${activeStatus}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                  aria-disabled={pageNum >= totalPages}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-ink text-xs font-bold transition-all ${
                    pageNum >= totalPages ? "opacity-40 pointer-events-none" : "bg-white hover:bg-canvas-lavender text-ink shadow-[2px_2px_0px_#18121E]"
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs font-medium text-ink/60 border-t-2 border-ink bg-white">
        <p>© {new Date().getFullYear()} Tutr Balasore • Administrative Application Management</p>
      </footer>
    </div>
  );
}
