"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  BookOpen,
  GraduationCap,
  MapPin,
  Home,
  Info,
  Sparkles,
  Search,
  LogIn,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Inbox,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Button } from "./Button";
import { TutrLogoBook, DoodleCurvedArrow } from "./TutrIllustrations";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"ADMIN" | "TUTOR" | "STUDENT" | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  // Load user session dynamically on client
  useEffect(() => {
    const supabase = createClient();

    async function loadAuth() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          setUser(null);
          setUserRole(null);
          setDisplayName("");
          return;
        }

        setUser(currentUser);

        // Fetch role from users table
        const { data: profile } = await supabase
          .from("users")
          .select("role, full_name, email")
          .eq("id", currentUser.id)
          .maybeSingle();

        const name =
          profile?.full_name ||
          currentUser.user_metadata?.full_name ||
          currentUser.email?.split("@")[0] ||
          "User";
        setDisplayName(name);

        if (profile?.role === "ADMIN") {
          setUserRole("ADMIN");
        } else if (profile?.role === "TUTOR") {
          setUserRole("TUTOR");
        } else {
          // Check if user has an application record
          const { data: tutorApp } = await supabase
            .from("tutor_applications")
            .select("id")
            .eq("user_id", currentUser.id)
            .limit(1);

          if (tutorApp && tutorApp.length > 0) {
            setUserRole("TUTOR");
          } else {
            setUserRole("STUDENT");
          }
        }
      } catch {
        setUser(null);
        setUserRole(null);
      }
    }

    loadAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadAuth();
      } else {
        setUser(null);
        setUserRole(null);
        setDisplayName("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/#about" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Find Tutors", href: "/tutors" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-canvas-lavender/95 backdrop-blur-md border-b-2 border-ink transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo & Balasore pill */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 group focus-visible:outline-none"
                aria-label="Tutr Home"
              >
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink font-sans">
                  Tutr
                </span>
                <TutrLogoBook className="w-8 h-8 transition-transform group-hover:rotate-6" />
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-ink border-2 border-ink shadow-[1.5px_1.5px_0px_#18121E]">
                  <MapPin className="w-3 h-3 text-coral" />
                  Balasore
                </span>
              </Link>
            </div>

            {/* Center Navigation Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-7 font-sans" aria-label="Main Navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-bold text-ink hover:text-coral transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Right CTAs with playful doodle arrow */}
            <div className="hidden md:flex items-center gap-3 relative">
              {/* Little curved doodle arrow pointing to Tutor button */}
              <div className="absolute -left-10 -top-4 pointer-events-none hidden lg:block">
                <DoodleCurvedArrow className="w-9 h-9 text-ink" />
              </div>

              <Button
                href="/login?next=/tutor"
                variant="tutor"
                size="sm"
                icon={<GraduationCap className="w-4 h-4 text-ink" />}
                ariaLabel="Navigate to Tutor Portal"
              >
                Join as a Tutor
              </Button>
              <Button
                href="/login?next=/student"
                variant="student"
                size="sm"
                icon={<BookOpen className="w-4 h-4 text-ink" />}
                ariaLabel="Navigate to Student Portal"
              >
                Find a Tutor
              </Button>
            </div>

            {/* Mobile & Tablet Hamburger Toggle Button */}
            <div className="flex md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-ink bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle focus:outline-none cursor-pointer active:translate-y-0.5"
                aria-controls="mobile-menu"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Close main menu" : "Open main menu"}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Full-Screen Mobile Navigation Drawer (Bypasses header stacking context) */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          className="fixed inset-0 z-[100] md:hidden bg-canvas-lavender flex flex-col overflow-x-hidden overflow-y-auto animate-in fade-in duration-200 w-full"
        >
          {/* Top Bar of Drawer */}
          <div className="h-16 sm:h-20 px-4 sm:px-6 border-b-2 border-ink bg-white/95 backdrop-blur-sm shrink-0 flex items-center w-full">
            <div className="max-w-md w-full mx-auto flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 group"
                aria-label="Tutr Home"
              >
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink font-sans">
                  Tutr
                </span>
                <TutrLogoBook className="w-7 h-7 sm:w-8 sm:h-8" />
                <span className="hidden min-[380px]:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warm-coral/15 text-ink border border-ink">
                  <MapPin className="w-3 h-3 text-warm-coral" />
                  Balasore
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-ink bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle focus:outline-none cursor-pointer active:translate-y-0.5 shrink-0 ml-2"
                aria-label="Close navigation menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Scrollable Navigation Body */}
          <div className="flex-1 px-4 sm:px-6 py-6 w-full">
            <div className="max-w-md w-full mx-auto space-y-6">
            {/* Authenticated User Status Card if Logged In */}
            {user && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E]">
                <div className="w-10 h-10 rounded-xl bg-warm-coral border-2 border-ink flex items-center justify-center text-white font-black text-sm shadow-[1px_1px_0px_#18121E]">
                  {displayName ? displayName.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5 text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-ink truncate">{displayName}</p>
                  <p className="text-[10px] font-bold text-warm-coral uppercase tracking-wider">
                    {userRole === "ADMIN"
                      ? "🛡️ Administrator"
                      : userRole === "TUTOR"
                      ? "🎓 Verified Tutor"
                      : "📖 Student"}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Options based on Auth State */}
            <nav className="flex flex-col gap-2.5" aria-label="Mobile Menu Links">
              {/* Common: Home */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle active:translate-y-0.5 transition-all"
              >
                <span className="flex items-center gap-3">
                  <Home className="w-4 h-4 text-warm-coral" />
                  <span>Home</span>
                </span>
                <ChevronRight className="w-4 h-4 text-ink/40" />
              </Link>

              {/* AUTH STATE A: STUDENT LOGGED IN */}
              {user && userRole === "STUDENT" && (
                <>
                  <Link
                    href="/student"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-warm-honey/30 rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-warm-honey/40 active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-ink" />
                      <span>Student Dashboard</span>
                    </span>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-white border border-ink text-ink">
                      Portal
                    </span>
                  </Link>

                  <Link
                    href="/student/requests"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <Inbox className="w-4 h-4 text-warm-coral" />
                      <span>My Requests</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink/40" />
                  </Link>

                  <Link
                    href="/student/connections"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>My Connections</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink/40" />
                  </Link>
                </>
              )}

              {/* AUTH STATE B: TUTOR LOGGED IN */}
              {user && userRole === "TUTOR" && (
                <>
                  <Link
                    href="/tutor"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-soft-purple/40 rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-soft-purple/50 active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <GraduationCap className="w-4 h-4 text-ink" />
                      <span>Tutor Dashboard / Status</span>
                    </span>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-white border border-ink text-ink">
                      Portal
                    </span>
                  </Link>

                  <Link
                    href="/tutor/requests"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <Inbox className="w-4 h-4 text-warm-coral" />
                      <span>Incoming Requests</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink/40" />
                  </Link>
                </>
              )}

              {/* AUTH STATE C: ADMIN LOGGED IN */}
              {user && userRole === "ADMIN" && (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-soft-purple/40 rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-soft-purple/50 active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <ShieldAlert className="w-4 h-4 text-ink" />
                      <span>Admin Overview</span>
                    </span>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-white border border-ink text-ink">
                      Admin
                    </span>
                  </Link>

                  <Link
                    href="/admin/applications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <GraduationCap className="w-4 h-4 text-warm-coral" />
                      <span>Tutor Applications Queue</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink/40" />
                  </Link>
                </>
              )}

              {/* Informational: About (Placed before CTAs for logged out, or after dashboard for logged in) */}
              {!user && (
                <>
                  <Link
                    href="/#about"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <Info className="w-4 h-4 text-warm-coral" />
                      <span>About</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink/40" />
                  </Link>

                  <Link
                    href="/#how-it-works"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-warm-coral" />
                      <span>How it works</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink/40" />
                  </Link>
                </>
              )}

              {/* PRIMARY CTA: Find a Tutor (Available for all states) */}
              <Link
                href="/tutors"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-3.5 px-4 text-sm font-black text-ink bg-warm-coral rounded-2xl border-2 border-ink shadow-[3px_3px_0px_#18121E] hover:bg-warm-coral/90 active:translate-y-0.5 transition-all mt-1"
              >
                <span className="flex items-center gap-3">
                  <Search className="w-4 h-4 text-ink" />
                  <span>Find a Tutor</span>
                </span>
                <span className="text-xs font-handwritten font-bold px-2.5 py-0.5 rounded-full bg-white border border-ink text-ink">
                  Explore
                </span>
              </Link>

              {/* SECONDARY CTA: Join as a Tutor (When NOT logged in as Tutor or Admin) */}
              {(!user || userRole === "STUDENT") && (
                <Link
                  href="/login?next=/tutor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-3.5 px-4 text-sm font-black text-ink bg-soft-purple rounded-2xl border-2 border-ink shadow-[3px_3px_0px_#18121E] hover:bg-soft-purple/90 active:translate-y-0.5 transition-all"
                >
                  <span className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 text-ink" />
                    <span>Join as a Tutor</span>
                  </span>
                  <span className="text-xs font-handwritten font-bold px-2.5 py-0.5 rounded-full bg-white border border-ink text-ink">
                    Teach
                  </span>
                </Link>
              )}

              {/* Informational: About & How it works when logged in */}
              {user && (
                <>
                  <Link
                    href="/#about"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <Info className="w-4 h-4 text-warm-coral" />
                      <span>About</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink/40" />
                  </Link>

                  <Link
                    href="/#how-it-works"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle active:translate-y-0.5 transition-all"
                  >
                    <span className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-warm-coral" />
                      <span>How it works</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink/40" />
                  </Link>
                </>
              )}
            </nav>

            {/* Authentication Action Section at bottom */}
            <div className="pt-4 border-t-2 border-ink/20">
              {user ? (
                <form action="/auth/signout" method="post" className="w-full">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-white border-2 border-ink text-sm font-black text-ink shadow-[3px_3px_0px_#18121E] hover:bg-rose-50 hover:text-rose-600 active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-warm-coral" />
                    <span>Logout</span>
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 text-sm font-black text-ink bg-white rounded-2xl border-2 border-ink shadow-[3px_3px_0px_#18121E] hover:bg-warm-honey/30 active:translate-y-0.5 transition-all"
                >
                  <LogIn className="w-4 h-4 text-warm-coral" />
                  <span>Login / Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
