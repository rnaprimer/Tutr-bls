import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "./Button";

export function AudienceCards() {
  return (
    <section id="about" className="py-20 md:py-28 bg-canvas-subtle border-b-2 border-ink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-muted mb-2 font-mono">
            AUDIENCE EXPERIENCE
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-ink font-sans">
            Choose How You Want to Join Tutr
          </h2>
          <p className="text-sm sm:text-base text-ink-muted mt-3 font-medium">
            Whether you need dedicated mentorship or want to share your expertise across Balasore,
            Tutr is built for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {/* Student Card */}
          <div className="rounded-3xl bg-white border-2 border-ink p-8 sm:p-10 shadow-[4px_4px_0px_#18121E] hover:shadow-[6px_6px_0px_#18121E] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex flex-col justify-between">
            <div>
              {/* Illustrated Header Art: Student & books */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-honey-light border-2 border-ink shadow-[2px_2px_0px_#18121E] flex items-center justify-center overflow-hidden">
                  <Image
                    src="/characters/character-02.png"
                    alt="Tutr student illustration"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#FCECE9] border-2 border-ink shadow-[2px_2px_0px_#18121E] flex items-center justify-center text-2xl">
                  📚
                </div>
                <div className="w-12 h-12 rounded-full bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] flex items-center justify-center text-xl">
                  🎒
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-honey-light text-ink border border-ink/20 mb-3">
                For Students & Parents
              </span>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3 font-sans">
                Looking for a tutor?
              </h3>

              <p className="text-ink-muted text-sm sm:text-base leading-relaxed mb-6 font-medium">
                Discover verified tutors based on subjects, classes, location and other preferences right here
                in Balasore.
              </p>

              <ul className="space-y-3 mb-8 text-sm font-semibold text-ink">
                <li className="flex items-center gap-3">
                  <span className="text-coral text-lg leading-none">⭐</span>
                  <span>Personalized 1-on-1 and small group tuition</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-coral text-lg leading-none">⭐</span>
                  <span>Local tutors who understand your curriculum</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-coral text-lg leading-none">⭐</span>
                  <span>Direct, transparent connection</span>
                </li>
              </ul>
            </div>

            <div className="pt-5 border-t-2 border-ink/15">
              <Button
                href="/login?next=/student"
                variant="coral"
                size="lg"
                className="w-full sm:w-auto font-bold"
                icon={<ArrowRight className="w-4 h-4 text-ink" />}
                iconPosition="right"
                ariaLabel="Find a Tutor - Go to Student Portal"
              >
                Find a Tutor
              </Button>
            </div>
          </div>

          {/* Tutor Card */}
          <div className="rounded-3xl bg-white border-2 border-ink p-8 sm:p-10 shadow-[4px_4px_0px_#18121E] hover:shadow-[6px_6px_0px_#18121E] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex flex-col justify-between">
            <div>
              {/* Illustrated Header Art: Teacher & lightbulb */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-purple-light border-2 border-ink shadow-[2px_2px_0px_#18121E] flex items-center justify-center overflow-hidden">
                  <Image
                    src="/characters/character-03.png"
                    alt="Tutr teacher illustration"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#FCECE9] border-2 border-ink shadow-[2px_2px_0px_#18121E] flex items-center justify-center text-2xl">
                  💡
                </div>
                <div className="w-12 h-12 rounded-full bg-white border-2 border-ink shadow-[2px_2px_0px_#18121E] flex items-center justify-center text-xl">
                  📝
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-light text-ink border border-ink/20 mb-3">
                For Teachers & Mentors
              </span>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-ink mb-3 font-sans">
                Want to teach?
              </h3>

              <p className="text-ink-muted text-sm sm:text-base leading-relaxed mb-6 font-medium">
                Join Tutr and connect with students in your local community. Share your knowledge
                and grow your teaching practice.
              </p>

              <ul className="space-y-3 mb-8 text-sm font-semibold text-ink">
                <li className="flex items-center gap-3">
                  <span className="text-purple-dark text-lg leading-none">🎓</span>
                  <span>Connect directly with local students in Balasore</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-purple-dark text-lg leading-none">💡</span>
                  <span>Teach subjects you are passionate about</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-purple-dark text-lg leading-none">⏰</span>
                  <span>Flexible schedules and personal recognition</span>
                </li>
              </ul>
            </div>

            <div className="pt-5 border-t-2 border-ink/15">
              <Button
                href="/login?next=/tutor"
                variant="coral"
                size="lg"
                className="w-full sm:w-auto font-bold"
                icon={<ArrowRight className="w-4 h-4 text-ink" />}
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
