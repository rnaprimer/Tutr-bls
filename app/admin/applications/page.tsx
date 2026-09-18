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
      <div className="min-h-screen flex flex-col justify-between bg-beige-light/40">
        <header className="w-full bg-white/95 border-b border-navy/10 px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy">
              <span>Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase px-2 py-0.5 rounded-full bg-sky/50 text-navy border border-sky">
                <MapPin className="w-3 h-3 text-teal" />
                Balasore
              </span>
            </Link>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-3xl border border-red-200 p-8 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto mb-6">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2">Access Denied</h1>
            <p className="text-xs text-navy/70 mb-6 leading-relaxed">
              You are signed in as <strong>{user?.email}</strong>, but this account does not have administrator privileges to view tutor applications.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-navy/20 hover:bg-beige/60 text-navy font-medium text-xs transition-colors"
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
    // Parameterized search against name, email, google_response_id
    query = query.or(
      `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,google_response_id.ilike.%${searchQuery}%`
    );
  }

  const { data: applications, count: filteredTotal } = await query;
  const totalFiltered = filteredTotal || 0;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-beige-light/40">
      {/* Top Navbar */}
      <header className="w-full bg-white/95 border-b border-navy/10 px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-40 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy">
              <span>Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase px-2 py-0.5 rounded-full bg-sky/50 text-navy border border-sky">
                <MapPin className="w-3 h-3 text-teal" />
                Balasore
              </span>
            </Link>
            <span className="text-xs font-mono text-navy/40">/</span>
            <Link
              href="/admin"
              className="text-xs font-semibold text-navy/70 hover:text-navy transition-colors"
            >
              Admin
            </Link>
            <span className="text-xs font-mono text-navy/40">/</span>
            <span className="text-xs font-semibold text-teal">Applications</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-navy/70">
              <User className="w-3.5 h-3.5 text-teal" />
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
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal bg-sky/30 px-3 py-1 rounded-full mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              Tutor Ingestion Pipeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
              Tutor Application Queue
            </h1>
            <p className="text-xs text-navy/60 mt-1">
              Live intake from Google Forms & Apps Script. Review qualifications, credentials, and approve verified profiles.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-navy/20 hover:bg-white text-navy text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <span>Admin Overview</span>
          </Link>
        </div>

        {/* Status Counts Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <Link
            href="/admin/applications"
            className={`p-4 rounded-2xl border transition-all ${
              activeStatus === "ALL"
                ? "bg-navy text-white border-navy shadow-sm"
                : "bg-white text-navy border-navy/10 hover:border-navy/30"
            }`}
          >
            <div className="text-[11px] font-medium opacity-80 uppercase tracking-wider">All Applications</div>
            <div className="text-2xl font-extrabold mt-1">{totalCount || 0}</div>
          </Link>

          <Link
            href="/admin/applications?status=PENDING"
            className={`p-4 rounded-2xl border transition-all ${
              activeStatus === "PENDING"
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-white text-navy border-navy/10 hover:border-amber-400"
            }`}
          >
            <div className="text-[11px] font-medium text-amber-600 opacity-90 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Pending
            </div>
            <div className="text-2xl font-extrabold mt-1 text-amber-900">{pendingCount || 0}</div>
          </Link>

          <Link
            href="/admin/applications?status=UNDER_REVIEW"
            className={`p-4 rounded-2xl border transition-all ${
              activeStatus === "UNDER_REVIEW"
                ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                : "bg-white text-navy border-navy/10 hover:border-sky-400"
            }`}
          >
            <div className="text-[11px] font-medium text-sky-600 opacity-90 uppercase tracking-wider flex items-center gap-1">
              <Play className="w-3 h-3 fill-current" />
              Under Review
            </div>
            <div className="text-2xl font-extrabold mt-1 text-sky-950">{underReviewCount || 0}</div>
          </Link>

          <Link
            href="/admin/applications?status=APPROVED"
            className={`p-4 rounded-2xl border transition-all ${
              activeStatus === "APPROVED"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-white text-navy border-navy/10 hover:border-emerald-400"
            }`}
          >
            <div className="text-[11px] font-medium text-emerald-600 opacity-90 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Approved
            </div>
            <div className="text-2xl font-extrabold mt-1 text-emerald-900">{approvedCount || 0}</div>
          </Link>

          <Link
            href="/admin/applications?status=REJECTED"
            className={`p-4 rounded-2xl border transition-all col-span-2 sm:col-span-1 ${
              activeStatus === "REJECTED"
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-white text-navy border-navy/10 hover:border-rose-400"
            }`}
          >
            <div className="text-[11px] font-medium text-rose-600 opacity-90 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Rejected
            </div>
            <div className="text-2xl font-extrabold mt-1 text-rose-900">{rejectedCount || 0}</div>
          </Link>
        </div>

        {/* Search & Status Filters Bar */}
        <div className="bg-white rounded-3xl border border-navy/10 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input Form */}
            <form method="GET" className="relative flex-1 w-full">
              {activeStatus !== "ALL" && (
                <input type="hidden" name="status" value={activeStatus} />
              )}
              <Search className="w-4 h-4 text-navy/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search by applicant name, email, or Google response ID..."
                className="w-full pl-9 pr-4 py-2.5 rounded-full border border-navy/15 text-xs text-navy placeholder:text-navy/40 focus:outline-none focus:ring-2 focus:ring-teal/50"
              />
            </form>

            {/* Quick Status Select for Mobile */}
            <div className="flex items-center gap-1 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <Link
                href={`/admin/applications${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeStatus === "ALL" ? "bg-navy text-white" : "bg-beige-light text-navy/70 hover:bg-beige"
                }`}
              >
                All
              </Link>
              <Link
                href={`/admin/applications?status=PENDING${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeStatus === "PENDING" ? "bg-amber-600 text-white" : "bg-beige-light text-navy/70 hover:bg-beige"
                }`}
              >
                Pending
              </Link>
              <Link
                href={`/admin/applications?status=UNDER_REVIEW${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeStatus === "UNDER_REVIEW" ? "bg-sky-600 text-white" : "bg-beige-light text-navy/70 hover:bg-beige"
                }`}
              >
                Under Review
              </Link>
              <Link
                href={`/admin/applications?status=APPROVED${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeStatus === "APPROVED" ? "bg-emerald-600 text-white" : "bg-beige-light text-navy/70 hover:bg-beige"
                }`}
              >
                Approved
              </Link>
              <Link
                href={`/admin/applications?status=REJECTED${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeStatus === "REJECTED" ? "bg-rose-600 text-white" : "bg-beige-light text-navy/70 hover:bg-beige"
                }`}
              >
                Rejected
              </Link>
            </div>
          </div>

          {searchQuery && (
            <div className="flex items-center justify-between text-xs text-navy/60 px-2">
              <span>
                Filtered by search: <strong>&ldquo;{searchQuery}&rdquo;</strong> ({totalFiltered} results)
              </span>
              <Link
                href={`/admin/applications${activeStatus !== "ALL" ? `?status=${activeStatus}` : ""}`}
                className="text-teal hover:underline font-medium"
              >
                Clear search
              </Link>
            </div>
          )}
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-3xl border border-navy/10 overflow-hidden shadow-sm">
          {applications && applications.length > 0 ? (
            <div className="divide-y divide-navy/5">
              {applications.map((app) => {
                const subList: string[] = Array.isArray(app.subjects) ? (app.subjects as string[]) : [];
                const classList: string[] = Array.isArray(app.classes) ? (app.classes as string[]) : [];

                return (
                  <div
                    key={app.id}
                    className="p-4 sm:p-6 hover:bg-beige-light/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-navy truncate">
                          {app.full_name}
                        </h3>

                        {app.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            PENDING
                          </span>
                        )}
                        {app.status === "UNDER_REVIEW" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                            <Play className="w-3 h-3 fill-current" />
                            UNDER REVIEW
                          </span>
                        )}
                        {app.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            APPROVED
                          </span>
                        )}
                        {app.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            REJECTED
                          </span>
                        )}

                        {app.location && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-navy/60">
                            <MapPin className="w-3 h-3 text-teal" />
                            {app.location}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-navy/60 flex-wrap">
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
                        <p className="text-xs text-navy/80 line-clamp-1">
                          <span className="font-semibold text-navy">Qualification: </span>
                          {app.qualification}
                        </p>
                      )}

                      {/* Subjects & Classes Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {subList.slice(0, 4).map((sub, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal/10 text-teal-dark border border-teal/20"
                          >
                            {sub}
                          </span>
                        ))}
                        {subList.length > 4 && (
                          <span className="text-[10px] text-navy/40 font-mono">
                            +{subList.length - 4} more
                          </span>
                        )}

                        {classList.length > 0 && (
                          <span className="text-[10px] text-navy/50 font-mono ml-2">
                            Classes: {classList.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                      <Link
                        href={`/admin/applications/${app.id}`}
                        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-semibold transition-colors shadow-xs"
                      >
                        <span>Review Dossier</span>
                        <ArrowRight className="w-3 h-3 text-teal" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-beige-light border border-navy/10 flex items-center justify-center text-navy/40 mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-navy">No Applications Found</h3>
              <p className="text-xs text-navy/60 max-w-sm mx-auto">
                {searchQuery
                  ? "No tutor applications match your search query."
                  : activeStatus !== "ALL"
                  ? `There are currently zero applications with status '${activeStatus}'.`
                  : "No tutor applications have been ingested yet from Google Forms."}
              </p>
              {(searchQuery || activeStatus !== "ALL") && (
                <Link
                  href="/admin/applications"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:underline pt-2"
                >
                  View all applications
                </Link>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-beige-light/40 border-t border-navy/10 flex items-center justify-between text-xs text-navy/70">
              <div>
                Showing <strong>{from + 1}</strong>–<strong>{Math.min(to + 1, totalFiltered)}</strong> of <strong>{totalFiltered}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/applications?page=${pageNum - 1}${activeStatus !== "ALL" ? `&status=${activeStatus}` : ""}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                  aria-disabled={pageNum <= 1}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-navy/15 text-xs font-semibold transition-colors ${
                    pageNum <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-white text-navy"
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
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-navy/15 text-xs font-semibold transition-colors ${
                    pageNum >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-white text-navy"
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
      <footer className="text-center py-6 text-xs text-navy/50 border-t border-navy/10 bg-white/60">
        <p>© {new Date().getFullYear()} Tutr Balasore • Administrative Application Management</p>
      </footer>
    </div>
  );
}
