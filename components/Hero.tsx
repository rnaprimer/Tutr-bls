import React from "react";
import { BookOpen, GraduationCap, CheckCircle2 } from "lucide-react";
import { Button } from "./Button";
import {
  HeroLeftIllustration,
  HeroRightIllustration,
  CommunityMapBanner,
  DoodleCloud,
} from "./TutrIllustrations";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-canvas-lavender border-b-2 border-ink">
      {/* Decorative subtle doodle clouds floating in background */}
      <div className="pointer-events-none absolute top-6 left-1/4 opacity-40 -z-0 hidden md:block">
        <DoodleCloud className="w-16 h-10 text-white" />
      </div>
      <div className="pointer-events-none absolute top-12 right-1/4 opacity-40 -z-0 hidden md:block">
        <DoodleCloud className="w-20 h-12 text-white" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main 3-Column Editorial Hero: Left Card, Center Message, Right Card */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-6 pt-4 mb-14">
          {/* Left Illustrated Character Card (Tutor & Dog) */}
          <div className="hidden lg:flex justify-start shrink-0">
            <HeroLeftIllustration className="w-64 xl:w-72" />
          </div>

          {/* Center Column: Sticker Pill, Big Heading, Subheading & Role CTAs */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            {/* Hand-drawn Balasore Sticker Pill */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-white border-2 border-ink shadow-[2.5px_2.5px_0px_#18121E] mb-6 rotate-[-1.5deg] hover:rotate-0 transition-transform">
              <span className="text-coral text-lg leading-none">📍</span>
              <span className="font-handwritten text-xl sm:text-2xl font-bold text-ink leading-none">
                Balasore, Odisha
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-ink leading-[1.12] mb-5 font-sans">
              Learn locally. <br />
              <span>Grow together.</span>
            </h1>

            {/* Subheading in soft editorial style */}
            <p className="text-base sm:text-lg text-ink-muted leading-relaxed mb-8 max-w-xl font-medium">
              Find the right tutor in <strong>your local community</strong>. Connect with trusted educators
              across Balasore for personal, focused learning.
            </p>

            {/* Two Primary Action Choices matching reference pill style */}
            <div className="w-full max-w-md flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 mb-8">
              <Button
                href="/login?next=/student"
                variant="student"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-bold justify-center"
                icon={<BookOpen className="w-5 h-5 text-ink" />}
                ariaLabel="I am a Student - Find a local tutor"
              >
                👉 I am a Student
              </Button>
              <Button
                href="/login?next=/tutor"
                variant="tutor"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-base font-bold justify-center"
                icon={<GraduationCap className="w-5 h-5 text-ink" />}
                ariaLabel="I am a Tutor - Join as a local educator"
              >
                👉 I am a Tutor
              </Button>
            </div>

            {/* Trust highlights checklist */}
            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-5 text-xs sm:text-sm font-bold text-ink-muted pt-3 border-t-2 border-ink/15 w-full max-w-lg">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-coral-dark" />
                Trusted local tutors
              </span>
              <span className="hidden sm:inline text-ink/30">•</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-coral-dark" />
                Simple discovery
              </span>
              <span className="hidden sm:inline text-ink/30">•</span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-coral-dark" />
                Personal learning
              </span>
            </div>
          </div>

          {/* Right Illustrated Character Card (Teacher & Student Girl) */}
          <div className="hidden lg:flex justify-end shrink-0">
            <HeroRightIllustration className="w-64 xl:w-72" />
          </div>
        </div>

        {/* Community Locality Banner matching the reference image */}
        <div className="max-w-4xl mx-auto pt-2">
          <CommunityMapBanner localityName="Balasore, Odisha" />
        </div>
      </div>
    </section>
  );
}
