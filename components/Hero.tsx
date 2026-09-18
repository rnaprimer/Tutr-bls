import React from "react";
import { BookOpen, GraduationCap, MapPin, CheckCircle2, Users } from "lucide-react";
import { Button } from "./Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32 bg-gradient-to-b from-beige-light/70 via-white to-white border-b border-navy/5">
      {/* Decorative subtle background accents */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-sky/30 rounded-full blur-3xl -z-10 opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-24 w-[300px] h-[300px] bg-beige/80 rounded-full blur-2xl -z-10 opacity-60"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Local Community Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-sky shadow-xs text-navy mb-8 transition-transform hover:scale-[1.02]">
            <span className="flex h-2 w-2 rounded-full bg-teal" />
            <span className="flex items-center gap-1 text-xs sm:text-sm font-medium text-navy-dark">
              <MapPin className="w-3.5 h-3.5 text-teal" />
              Built for local learning in <strong>Balasore, Odisha</strong>
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-navy leading-[1.15] mb-6">
            Learn locally. <br className="hidden sm:inline" />
            <span className="text-teal">Grow together.</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-navy/80 leading-relaxed mb-10 max-w-2xl">
            Find the right tutor in your local community. Connecting students with trusted educators
            across Balasore for personal, focused learning.
          </p>

          {/* Two Primary Action Choices */}
          <div className="w-full max-w-md flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 mb-10">
            <Button
              href="/login?next=/student"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-7 py-4 text-base font-semibold border-2 border-navy/20 hover:border-navy text-navy hover:bg-beige/40 justify-center shadow-xs"
              icon={<BookOpen className="w-5 h-5 text-teal" />}
              ariaLabel="I am a Student - Find a local tutor"
            >
              I am a Student
            </Button>
            <Button
              href="/login?next=/tutor"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-7 py-4 text-base font-semibold bg-navy hover:bg-navy-dark text-white justify-center shadow-md hover:shadow-lg"
              icon={<GraduationCap className="w-5 h-5 text-sky" />}
              ariaLabel="I am a Tutor - Join as a local educator"
            >
              I am a Tutor
            </Button>
          </div>

          {/* Key Value Propositions / Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm font-medium text-navy/70 pt-2 border-t border-navy/10 w-full max-w-xl">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal" />
              Trusted local tutors
            </span>
            <span className="hidden sm:inline text-navy/30">•</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal" />
              Simple discovery
            </span>
            <span className="hidden sm:inline text-navy/30">•</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal" />
              Personal learning
            </span>
          </div>
        </div>

        {/* Local Community Visual Card */}
        <div className="mt-14 max-w-3xl mx-auto rounded-2xl bg-white border border-navy/10 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-beige flex items-center justify-center text-navy shrink-0 border border-beige-dark">
                <Users className="w-6 h-6 text-teal" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-navy">
                  Hyperlocal to Balasore
                </h3>
                <p className="text-sm text-navy/70 mt-1">
                  Connecting students and tutors across Balasore, Odisha for face-to-face and
                  neighborhood-first academic guidance.
                </p>
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal bg-sky/40 border border-sky rounded-full">
                Balasore, Odisha
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
