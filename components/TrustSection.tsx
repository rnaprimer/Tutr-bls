import React from "react";
import { MapPin, ShieldCheck, Zap } from "lucide-react";

export function TrustSection() {
  const pillars = [
    {
      title: "Local",
      description: "Focused on the Balasore community.",
      subtext: "Designed specifically for students and tutors residing in Balasore, Odisha.",
      icon: <MapPin className="w-6 h-6 text-teal" />,
      tag: "Community First",
    },
    {
      title: "Verified",
      description: "Tutor applications are reviewed before profiles become publicly available.",
      subtext: "A concept focused on trust, credibility, and student safety.",
      icon: <ShieldCheck className="w-6 h-6 text-teal" />,
      tag: "Quality Standard",
    },
    {
      title: "Simple",
      description: "No complicated process for students or tutors.",
      subtext: "Direct pathways without endless bureaucracy or confusing menus.",
      icon: <Zap className="w-6 h-6 text-teal" />,
      tag: "Frictionless",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white border-b border-navy/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal mb-2">
            Our Foundation
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy">
            Built on Trust & Simplicity
          </h2>
          <p className="text-base text-navy/70 mt-3">
            Education requires trust. Here is how Tutr is designed to serve our community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="p-8 rounded-2xl bg-white border border-navy/10 hover:border-teal/30 hover:shadow-sm transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-beige flex items-center justify-center mb-6">
                {pillar.icon}
              </div>

              <div className="inline-block px-2.5 py-0.5 rounded-full bg-sky/40 text-[11px] font-semibold text-navy-dark uppercase tracking-wider mb-3">
                {pillar.tag}
              </div>

              <h3 className="text-xl font-bold text-navy mb-2">{pillar.title}</h3>

              <p className="text-base font-medium text-navy/90 mb-2">
                {pillar.description}
              </p>

              <p className="text-xs text-navy/60 leading-relaxed">
                {pillar.subtext}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
