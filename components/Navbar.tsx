"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, BookOpen, GraduationCap, MapPin } from "lucide-react";
import { Button } from "./Button";

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
    { label: "About", href: "/#about" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Contact", href: "/#contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-navy/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy hover:opacity-90 transition-opacity"
              aria-label="Tutr Home"
            >
              <span>Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sky/50 text-navy-dark border border-sky">
                <MapPin className="w-3 h-3 text-teal" />
                Balasore
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-navy/80 hover:text-navy transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Right CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Button
              href="/login?next=/student"
              variant="outline"
              size="sm"
              icon={<BookOpen className="w-4 h-4 text-teal" />}
              ariaLabel="Navigate to Student Portal"
            >
              I am a Student
            </Button>
            <Button
              href="/login?next=/tutor"
              variant="primary"
              size="sm"
              icon={<GraduationCap className="w-4 h-4 text-sky" />}
              ariaLabel="Navigate to Tutor Portal"
            >
              I am a Tutor
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-navy hover:bg-beige/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
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
          className="sm:hidden fixed inset-x-0 top-[64px] bottom-0 bg-white/98 backdrop-blur-lg border-b border-navy/10 px-6 py-6 overflow-y-auto flex flex-col justify-between shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-navy/10">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal">
                Hyperlocal Tutoring in Balasore
              </span>
            </div>

            <nav className="flex flex-col gap-2 pt-2" aria-label="Mobile Navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 px-3 text-base font-medium text-navy hover:bg-beige rounded-xl transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Mobile Dual Action Buttons */}
          <div className="pt-6 border-t border-navy/10 flex flex-col gap-3 pb-8">
            <p className="text-xs text-navy/60 font-medium text-center mb-1">
              Choose your role to get started
            </p>
            <Button
              href="/login?next=/student"
              variant="outline"
              size="lg"
              className="w-full justify-center"
              icon={<BookOpen className="w-5 h-5 text-teal" />}
              onClick={() => setMobileMenuOpen(false)}
            >
              I am a Student
            </Button>
            <Button
              href="/login?next=/tutor"
              variant="primary"
              size="lg"
              className="w-full justify-center"
              icon={<GraduationCap className="w-5 h-5 text-sky" />}
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
