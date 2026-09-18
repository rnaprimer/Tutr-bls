import React from "react";
import { BookOpen, GraduationCap, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "./Button";

export function AudienceCards() {
  return (
    <section id="about" className="py-20 md:py-28 bg-beige-light/40 border-b border-navy/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-teal mb-2">
            Tailored Experiences
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy">
            Choose How You Want to Join Tutr
          </h2>
          <p className="text-base text-navy/70 mt-3">
            Whether you need dedicated mentorship or want to share your expertise across Balasore,
            Tutr is built for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {/* Student Card */}
          <div className="rounded-3xl bg-white border border-navy/10 p-8 sm:p-10 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky/30 rounded-bl-full -z-0 pointer-events-none" />

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-sky/40 border border-sky flex items-center justify-center text-navy mb-6">
                <BookOpen className="w-7 h-7 text-teal" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-teal">
                For Students & Parents
              </span>

              <h3 className="text-2xl sm:text-3xl font-bold text-navy mt-2 mb-4">
                Looking for a tutor?
              </h3>

              <p className="text-navy/70 text-base leading-relaxed mb-6">
                Discover tutors based on subjects, classes, location and other preferences right here
                in Balasore.
              </p>

              <ul className="space-y-2.5 mb-8 text-sm text-navy/80">
                <li className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-teal shrink-0" />
                  <span>Personalized 1-on-1 and small group tuition</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-teal shrink-0" />
                  <span>Local tutors who understand your curriculum</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-teal shrink-0" />
                  <span>Direct, transparent connection</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 pt-4 border-t border-navy/10">
              <Button
                href="/login?next=/student"
                variant="outline"
                size="lg"
                className="w-full sm:w-auto font-semibold border-navy/30 hover:border-navy hover:bg-beige"
                icon={<ArrowRight className="w-4 h-4 text-teal" />}
                iconPosition="right"
                ariaLabel="Find a Tutor - Go to Student Portal"
              >
                Find a Tutor
              </Button>
            </div>
          </div>

          {/* Tutor Card */}
          <div className="rounded-3xl bg-white border border-navy/10 p-8 sm:p-10 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-beige-dark/40 rounded-bl-full -z-0 pointer-events-none" />

            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-beige border border-beige-dark flex items-center justify-center text-navy mb-6">
                <GraduationCap className="w-7 h-7 text-navy" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-teal">
                For Teachers & Mentors
              </span>

              <h3 className="text-2xl sm:text-3xl font-bold text-navy mt-2 mb-4">
                Want to teach?
              </h3>

              <p className="text-navy/70 text-base leading-relaxed mb-6">
                Join Tutr and connect with students in your local community. Share your knowledge
                and grow your teaching practice.
              </p>

              <ul className="space-y-2.5 mb-8 text-sm text-navy/80">
                <li className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-teal shrink-0" />
                  <span>Connect directly with local students in Balasore</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-teal shrink-0" />
                  <span>Teach subjects you are passionate about</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-teal shrink-0" />
                  <span>Flexible schedules and personal recognition</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 pt-4 border-t border-navy/10">
              <Button
                href="/login?next=/tutor"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto font-semibold bg-navy hover:bg-navy-dark shadow-sm"
                icon={<ArrowRight className="w-4 h-4 text-sky" />}
                iconPosition="right"
                ariaLabel="Become a Tutor - Go to Tutor Portal"
              >
                Become a Tutor
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
