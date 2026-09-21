import React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { TutrLogoBook, FooterAvatarsCluster } from "./TutrIllustrations";

export function Footer() {
  return (
    <footer id="contact" className="bg-canvas-lavender border-t-2 border-ink py-12 md:py-16 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-10 border-b-2 border-ink/20">
          {/* Left branding */}
          <div className="text-center lg:text-left">
            <Link
              href="/"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink inline-flex items-center gap-2 group"
            >
              <span>Tutr</span>
              <TutrLogoBook className="w-8 h-8 transition-transform group-hover:rotate-6" />
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-ink border-2 border-ink shadow-[1.5px_1.5px_0px_#18121E]">
                <MapPin className="w-3 h-3 text-coral" />
                Balasore
              </span>
            </Link>
            <p className="text-sm font-bold text-ink mt-2">
              Learn locally. Grow together.
            </p>
            <p className="text-xs text-ink-muted mt-1 max-w-sm">
              Hyperlocal tutoring platform for students and verified educators across Balasore, Odisha.
            </p>
          </div>

          {/* Center: Community Avatars cluster from reference image */}
          <div className="flex flex-col items-center">
            <FooterAvatarsCluster />
            <span className="text-[11px] font-bold text-ink-muted mt-2 tracking-wide uppercase">
              Local Learning Community
            </span>
          </div>

          {/* Right: Navigation links */}
          <nav className="flex flex-wrap justify-center lg:justify-end gap-5 sm:gap-7 font-bold text-sm text-ink" aria-label="Footer Navigation">
            <Link
              href="/"
              className="hover:text-coral transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
            >
              Home
            </Link>
            <Link
              href="/#about"
              className="hover:text-coral transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
            >
              About
            </Link>
            <Link
              href="/#how-it-works"
              className="hover:text-coral transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
            >
              How it works
            </Link>
            <Link
              href="/tutors"
              className="hover:text-coral transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
            >
              Find Tutors
            </Link>
            <Link
              href="/student"
              className="hover:text-coral transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
            >
              Student Portal
            </Link>
            <Link
              href="/tutor"
              className="hover:text-coral transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded"
            >
              Tutor Portal
            </Link>
          </nav>
        </div>

        {/* Bottom copyright notice */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted font-medium">
          <p>© {new Date().getFullYear()} Tutr Balasore. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Dedicated to local, personal learning in Balasore, Odisha.
          </p>
        </div>
      </div>
    </footer>
  );
}
