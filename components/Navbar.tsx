"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, BookOpen, GraduationCap, MapPin } from "lucide-react";
import { Button } from "./Button";
import { TutrLogoBook, DoodleCurvedArrow } from "./TutrIllustrations";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/#about" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Find Tutors", href: "/tutors" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-canvas-lavender/95 backdrop-blur-md border-b-2 border-ink transition-colors">
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

          {/* Center Navigation Links */}
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
          <div className="hidden sm:flex items-center gap-3 relative">
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

          {/* Mobile Menu Toggle Button */}
          <div className="flex sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-ink bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] hover:bg-canvas-subtle focus:outline-none cursor-pointer"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close main menu" : "Open main menu"}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="sm:hidden fixed inset-x-0 top-[64px] bottom-0 bg-canvas-lavender border-b-2 border-ink px-6 py-6 overflow-y-auto flex flex-col justify-between shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-ink/20">
              <span className="tutr-badge px-3 py-1 bg-white text-xs font-bold text-ink">
                📍 Hyperlocal Tutoring in Balasore
              </span>
            </div>

            <nav className="flex flex-col gap-2 pt-2" aria-label="Mobile Navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 px-4 text-base font-bold text-ink bg-white border-2 border-ink rounded-2xl shadow-[2px_2px_0px_#18121E] hover:bg-honey-light transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Mobile Dual Action Buttons */}
          <div className="pt-6 border-t-2 border-ink/20 flex flex-col gap-3 pb-8">
            <p className="text-xs text-ink-muted font-bold text-center mb-1">
              Choose your role to get started:
            </p>
            <Button
              href="/login?next=/student"
              variant="student"
              size="lg"
              className="w-full justify-center"
              icon={<BookOpen className="w-5 h-5 text-ink" />}
              onClick={() => setMobileMenuOpen(false)}
            >
              I am a Student
            </Button>
            <Button
              href="/login?next=/tutor"
              variant="tutor"
              size="lg"
              className="w-full justify-center"
              icon={<GraduationCap className="w-5 h-5 text-ink" />}
              onClick={() => setMobileMenuOpen(false)}
            >
              I am a Tutor
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
