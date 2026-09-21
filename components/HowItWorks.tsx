import React from "react";
import {
  CompassDoodle,
  HandshakeDoodle,
  BooksStackDoodle,
  StepSpeechBubble,
  GrowSpeechCloud,
} from "./TutrIllustrations";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      badge: "STEP 1",
      title: "Choose your path",
      description:
        "Select whether you are a Student looking for academic support or a Tutor looking to teach locally in Balasore.",
      highlight: "Student or Tutor",
      illustration: <CompassDoodle className="w-14 h-14" />,
      rotate: "rotate-[-1.5deg]",
    },
    {
      number: "02",
      badge: "STEP 2",
      title: "Connect",
      description:
        "Students discover suitable verified tutors tailored to their subjects and grade. Tutors apply directly through Tutr.",
      highlight: "Students discover tutors • Tutors apply",
      illustration: <HandshakeDoodle className="w-14 h-14" />,
      rotate: "rotate-[1deg]",
    },
    {
      number: "03",
      badge: "1, 2, 3",
      title: "Learn locally.",
      description:
        "Build meaningful, focused local learning connections within your community in Balasore, Odisha.",
      highlight: "Community-driven learning",
      illustration: <BooksStackDoodle className="w-14 h-14" />,
      rotate: "rotate-[-1deg]",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-canvas-white border-b-2 border-ink relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Paper Posters label */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted mb-2 font-mono">
            PAPER POSTERS
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink font-sans">
            How Tutr Works
          </h2>
          <p className="text-sm sm:text-base text-ink-muted mt-3 font-medium">
            Designed to make finding and offering quality local tutoring effortless in Balasore.
          </p>
        </div>

        {/* 3 Step Paper Poster Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative rounded-3xl bg-[#F28F85] border-2 border-ink p-8 shadow-[4px_4px_0px_#18121E] hover:shadow-[6px_6px_0px_#18121E] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] flex flex-col justify-between ${step.rotate} hover:rotate-0`}
            >
              {/* Floating Speech Bubble on top center/right */}
              <div className="absolute -top-4 right-8 z-20">
                <StepSpeechBubble text={step.badge} />
              </div>

              <div>
                {/* Illustrated Icon container */}
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] flex items-center justify-center mb-6">
                  {step.illustration}
                </div>

                {/* Step Title */}
                <h3 className="text-2xl font-extrabold text-ink mb-3 font-sans">
                  {step.title}
                </h3>

                {/* Step Description */}
                <p className="text-sm text-ink/90 font-medium leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              {/* Step Highlight badge pill at bottom */}
              <div className="pt-4 border-t-2 border-ink/20 flex items-center justify-between">
                <span className="text-xs font-bold text-ink bg-white/80 border border-ink/30 px-3 py-1 rounded-full">
                  {step.highlight}
                </span>

                {/* Extra GROW! badge on card 3 */}
                {index === 2 && <GrowSpeechCloud />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
