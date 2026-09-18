import React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer id="contact" className="bg-beige-light border-t border-navy/10 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-12 border-b border-navy/10">
          <div>
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight text-navy inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <span>Tutr</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-sky/50 text-navy-dark border border-sky">
                <MapPin className="w-3 h-3 text-teal" />
                Balasore
              </span>
            </Link>
            <p className="text-sm text-navy/70 mt-2 font-medium">
              Learn locally. Grow together.
            </p>
            <p className="text-xs text-navy/50 mt-1">
              Hyperlocal tutoring marketplace in Balasore, Odisha.
            </p>
          </div>

          <nav className="flex flex-wrap gap-6 sm:gap-8" aria-label="Footer Navigation">
            <Link
              href="/student"
              className="text-sm font-medium text-navy/80 hover:text-navy transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
            >
              Student
            </Link>
            <Link
              href="/tutor"
              className="text-sm font-medium text-navy/80 hover:text-navy transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
            >
              Tutor
            </Link>
            <Link
              href="/#about"
              className="text-sm font-medium text-navy/80 hover:text-navy transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
            >
              About
            </Link>
            <Link
              href="/#contact"
              className="text-sm font-medium text-navy/80 hover:text-navy transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal rounded"
            >
              Contact
            </Link>
          </nav>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-navy/60">
          <p>© {new Date().getFullYear()} Tutr. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Dedicated to local learning across Balasore, Odisha.
          </p>
        </div>
      </div>
    </footer>
  );
}
