import React from "react";
import { Compass, UserCheck, Sparkles } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Choose your path",
      description: "Select whether you are a Student looking for academic support or a Tutor looking to teach locally.",
      highlight: "Student or Tutor",
      icon: <Compass className="w-6 h-6 text-teal" />,
    },
    {
      number: "02",
      title: "Connect",
      description: "Students discover suitable tutors tailored to their subjects and grade. Tutors apply directly through Tutr.",
      highlight: "Students discover tutors • Tutors apply",
      icon: <UserCheck className="w-6 h-6 text-teal" />,
    },
    {
      number: "03",
      title: "Learn locally",
      description: "Build meaningful local learning connections within your community in Balasore, Odisha.",
      highlight: "Community-driven learning",
      icon: <Sparkles className="w-6 h-6 text-teal" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white border-b border-navy/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal mb-2">
            Simple Process
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy">
            How Tutr Works
          </h2>
          <p className="text-base text-navy/70 mt-3">
            Designed to make finding and offering quality local tutoring effortless in Balasore.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative rounded-2xl bg-beige-light/60 hover:bg-white border border-navy/10 hover:border-teal/40 p-8 transition-all duration-300 hover:shadow-lg flex flex-col justify-between"
            >
              <div>
                {/* Header with Step Number and Icon */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-extrabold text-navy/30 group-hover:text-teal/80 transition-colors font-mono">
                    {step.number}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-white group-hover:bg-sky/40 border border-navy/10 flex items-center justify-center transition-colors">
                    {step.icon}
                  </div>
                </div>

                {/* Step Title */}
                <h3 className="text-xl font-bold text-navy mb-2">
                  {step.title}
                </h3>

                {/* Step Description */}
                <p className="text-sm text-navy/70 leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              {/* Step Highlight pill */}
              <div className="pt-4 border-t border-navy/10">
                <span className="text-xs font-semibold text-teal tracking-wide">
                  {step.highlight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
