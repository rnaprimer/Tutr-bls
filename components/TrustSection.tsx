import React from "react";
import { MapPin, ShieldCheck, Zap } from "lucide-react";
import { BuiltOnTrustBadge } from "./TutrIllustrations";

export function TrustSection() {
  const pillars = [
    {
      title: "Local",
      description: "Focused on the Balasore community.",
      subtext: "Designed specifically for students and tutors residing right here in Balasore, Odisha.",
      icon: <MapPin className="w-6 h-6 text-ink" />,
      bg: "bg-[#F28F85]",
      rotate: "rotate-[-1deg]",
    },
    {
      title: "Verified",
      description: "Admin reviews credentials before tutor profiles go live.",
      subtext: "Every applicant dossier is verified to maintain authentic teaching quality and peace of mind.",
      icon: <ShieldCheck className="w-6 h-6 text-ink" />,
      bg: "bg-[#F28F85]",
      rotate: "rotate-[1.5deg]",
    },
    {
      title: "Simple",
      description: "No complicated barriers or endless bureaucracy.",
      subtext: "Direct subject discovery, clear monthly fees, and transparent contact unlock.",
      icon: <Zap className="w-6 h-6 text-ink" />,
      bg: "bg-[#FAF7F2]",
      rotate: "rotate-[-1.5deg]",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-canvas-lavender border-b-2 border-ink relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted mb-2 font-mono">
            OUR FOUNDATION
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink font-sans">
            Our Foundation
          </h2>
          <p className="text-sm sm:text-base text-ink-muted mt-3 font-medium">
            Find us as a local foundation built on trust to support learning across our community.
          </p>
        </div>

        {/* 3 Pillars with floating BUILT ON TRUST badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className={`relative rounded-3xl ${pillar.bg} border-2 border-ink p-8 shadow-[4px_4px_0px_#18121E] hover:shadow-[6px_6px_0px_#18121E] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex flex-col justify-between ${pillar.rotate} hover:rotate-0`}
            >
              {/* Floating Built on Trust badge on top right */}
              <div className="absolute -top-3.5 right-6 z-20">
                <BuiltOnTrustBadge />
              </div>

              <div>
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] flex items-center justify-center mb-6">
                  {pillar.icon}
                </div>

                <h3 className="text-2xl font-extrabold text-ink mb-2 font-sans">
                  {pillar.title}
                </h3>

                <p className="text-base font-bold text-ink mb-2">
                  {pillar.description}
                </p>

                <p className="text-xs sm:text-sm text-ink/80 font-medium leading-relaxed">
                  {pillar.subtext}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
