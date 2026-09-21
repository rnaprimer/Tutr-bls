import React from "react";
import Image from "next/image";

/**
 * Hand-drawn book mascot for Tutr brand
 */
export function TutrLogoBook({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M6 8C12 6 18 8 20 11C22 8 28 6 34 8V28C28 26 22 28 20 31C18 28 12 26 6 28V8Z"
        fill="#FAF7F2"
        stroke="#18121E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 11V31"
        stroke="#18121E"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M10 14C13 13 16 14 17 15"
        stroke="#18121E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 18C13 17 16 18 17 19"
        stroke="#18121E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M23 15C24 14 27 13 30 14"
        stroke="#18121E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M23 19C24 18 27 17 30 18"
        stroke="#18121E"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Pink ribbon */}
      <path
        d="M20 8V18L22 16L24 18V8"
        fill="#F28F85"
        stroke="#18121E"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hand-drawn curved arrow pointing to top right CTA
 */
export function DoodleCurvedArrow({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 50" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M12 42C14 26 28 14 48 12"
        stroke="#18121E"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeDasharray="4 2"
      />
      <path
        d="M38 8L50 12L42 22"
        stroke="#18121E"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hero Left Illustration: Framed card with tutor man and educator character
 */
export function HeroLeftIllustration({ className = "w-56" }: { className?: string }) {
  return (
    <div className={`relative ${className} select-none pointer-events-none`}>
      {/* Decorative cloud at top right */}
      <div className="absolute -top-5 -right-4 z-20">
        <DoodleCloud className="w-14 h-8 text-white drop-shadow-xs" />
      </div>

      {/* Main card */}
      <div className="bg-[#FAF7F2] border-2 border-ink rounded-3xl p-3 shadow-[4px_4px_0px_#18121E] rotate-[-2deg]">
        <div className="bg-[#FCECE9] border border-ink/20 rounded-2xl p-4 flex flex-col items-center gap-3">
          {/* Upper portrait: Character 01 (bearded tutor with glasses) */}
          <div className="w-20 h-20 rounded-full bg-white border-2 border-ink flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_#18121E]">
            <Image
              src="/characters/character-01.png"
              alt="Tutr character - tutor with glasses"
              width={80}
              height={80}
              className="w-full h-full object-cover"
              priority
            />
          </div>

          {/* Lower portrait: Character 03 (young professional educator) */}
          <div className="w-28 h-24 rounded-2xl bg-white border-2 border-ink flex items-center justify-center p-1 relative overflow-hidden shadow-[2px_2px_0px_#18121E]">
            <Image
              src="/characters/character-03.png"
              alt="Tutr character - educator"
              width={112}
              height={96}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Decorative small cloud bottom left */}
      <div className="absolute -bottom-4 -left-4 z-20">
        <DoodleCloud className="w-16 h-9 text-white drop-shadow-xs" />
      </div>
    </div>
  );
}

/**
 * Hero Right Illustration: Framed card with cheerful child and student girl
 */
export function HeroRightIllustration({ className = "w-56" }: { className?: string }) {
  return (
    <div className={`relative ${className} select-none pointer-events-none`}>
      {/* Decorative cloud at top left */}
      <div className="absolute -top-4 -left-3 z-20">
        <DoodleCloud className="w-14 h-8 text-white drop-shadow-xs" />
      </div>

      {/* Main card */}
      <div className="bg-[#FAF7F2] border-2 border-ink rounded-3xl p-3 shadow-[4px_4px_0px_#18121E] rotate-[2deg]">
        <div className="bg-[#FCECE9] border border-ink/20 rounded-2xl p-4 flex flex-col items-center gap-3">
          {/* Upper portrait: Character 02 (cheerful child with both hands raised) */}
          <div className="w-28 h-20 rounded-2xl bg-white border-2 border-ink flex items-center justify-center p-1 overflow-hidden shadow-[2px_2px_0px_#18121E]">
            <Image
              src="/characters/character-02.png"
              alt="Tutr character - cheerful child"
              width={112}
              height={80}
              className="w-full h-full object-contain"
              priority
            />
          </div>

          {/* Lower portrait: Character 04 (woman with black hair) */}
          <div className="w-20 h-24 rounded-full bg-white border-2 border-ink flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_#18121E]">
            <Image
              src="/characters/character-04.png"
              alt="Tutr character - learner"
              width={80}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Decorative small cloud bottom right */}
      <div className="absolute -bottom-4 -right-4 z-20">
        <DoodleCloud className="w-16 h-9 text-white drop-shadow-xs" />
      </div>
    </div>
  );
}

/**
 * Community Locality Map Banner Illustration (Balasore community focus)
 */
export function CommunityMapBanner({
  localityName = "Balasore, Odisha",
}: {
  localityName?: string;
}) {
  return (
    <div className="w-full tutr-card bg-[#FCECE9] overflow-hidden p-6 sm:p-8 relative">
      {/* Background illustrated map lines pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 40 M 0 0 L 40 40" fill="none" stroke="#18121E" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left character: Character 05 (curly-haired student in striped shirt) */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-ink overflow-hidden p-0.5 shrink-0 shadow-[2.5px_2.5px_0px_#18121E]">
            <Image
              src="/characters/character-05.png"
              alt="Tutr character - student"
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted block">
              Hyperlocal Directory
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-ink leading-tight">
              Find a tutor in your community
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
              Connecting trusted educators and students across:
            </p>
          </div>
        </div>

        {/* Center/Right: Hand-drawn script locality badge pill */}
        <div className="flex items-center gap-3">
          <div className="bg-white border-2 border-ink rounded-2xl px-5 py-3 shadow-[3px_3px_0px_#18121E] rotate-[-1deg]">
            <div className="flex items-center gap-2">
              <span className="text-coral-dark text-lg">📍</span>
              <span className="font-handwritten text-2xl sm:text-3xl font-bold text-ink leading-none">
                {localityName}
              </span>
            </div>
          </div>

          {/* Right character: Character 01 (bearded tutor) */}
          <div className="hidden sm:flex w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-ink overflow-hidden p-0.5 shrink-0 shadow-[2.5px_2.5px_0px_#18121E]">
            <Image
              src="/characters/character-01.png"
              alt="Tutr character - mentor"
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Doodle Cloud SVG
 */
export function DoodleCloud({ className = "w-12 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 38" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M14 32C8 32 4 28 4 22C4 17 8 13 13 13C14 7 20 2 28 2C35 2 41 6 43 12C46 12 50 14 53 18C56 22 55 27 51 30C48 32 44 32 42 32H14Z"
        fill="currentColor"
        stroke="#18121E"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Speech Bubble for Step Card (e.g. "STEP 1", "STEP 2", "1, 2, 3")
 */
export function StepSpeechBubble({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center px-3 py-1 bg-white border-2 border-ink rounded-full text-xs font-bold text-ink shadow-[2px_2px_0px_#18121E] ${className}`}
    >
      <span>{text}</span>
    </div>
  );
}

/**
 * "GROW!" Speech Cloud
 */
export function GrowSpeechCloud({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center px-3 py-1 bg-white border-2 border-ink rounded-full font-handwritten text-base font-extrabold text-ink shadow-[2px_2px_0px_#18121E] rotate-[3deg] ${className}`}
    >
      <span>GROW! 🌱</span>
    </div>
  );
}

/**
 * Hand-drawn compass doodle icon
 */
export function CompassDoodle({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="32" cy="32" r="26" fill="#FAF7F2" stroke="#18121E" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="21" fill="none" stroke="#18121E" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Compass Needle */}
      <polygon points="32,15 37,32 32,28 27,32" fill="#F28F85" stroke="#18121E" strokeWidth="2" />
      <polygon points="32,49 37,32 32,36 27,32" fill="#CBB7F0" stroke="#18121E" strokeWidth="2" />
      <circle cx="32" cy="32" r="3" fill="#18121E" />
      {/* Top hanger loop */}
      <circle cx="32" cy="6" r="4" fill="none" stroke="#18121E" strokeWidth="2" />
    </svg>
  );
}

/**
 * Handshake doodle icon
 */
export function HandshakeDoodle({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4" y="16" width="56" height="36" rx="10" fill="#FAF7F2" stroke="#18121E" strokeWidth="2.5" />
      {/* Left arm sleeve */}
      <path d="M4 22L16 26V42L4 46" fill="#CBB7F0" stroke="#18121E" strokeWidth="2" />
      {/* Right arm sleeve */}
      <path d="M60 22L48 26V42L60 46" fill="#F6BD75" stroke="#18121E" strokeWidth="2" />
      {/* Handshake clasp */}
      <path
        d="M16 32L26 26C29 24 33 26 35 29L38 33L48 32"
        stroke="#18121E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 38L32 44C34 46 38 46 40 43L48 36"
        stroke="#18121E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="34" r="2" fill="#F28F85" />
    </svg>
  );
}

/**
 * Books stack with flag doodle icon
 */
export function BooksStackDoodle({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Bottom book */}
      <rect x="10" y="44" width="44" height="12" rx="3" fill="#F6BD75" stroke="#18121E" strokeWidth="2.5" />
      <path d="M16 44V56" stroke="#18121E" strokeWidth="2" />
      {/* Middle book */}
      <rect x="14" y="32" width="40" height="12" rx="3" fill="#CBB7F0" stroke="#18121E" strokeWidth="2.5" />
      <path d="M20 32V44" stroke="#18121E" strokeWidth="2" />
      {/* Top book */}
      <rect x="12" y="20" width="38" height="12" rx="3" fill="#FAF7F2" stroke="#18121E" strokeWidth="2.5" />
      <path d="M18 20V32" stroke="#18121E" strokeWidth="2" />
      {/* Flag pole and tri-color pennant */}
      <path d="M48 24V4" stroke="#18121E" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 4H62L57 10L62 16H48" fill="#F28F85" stroke="#18121E" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Footer Avatars Cluster (center of footer from reference image)
 */
export function FooterAvatarsCluster({ className = "" }: { className?: string }) {
  const characters = [
    { src: "/characters/character-01.png", alt: "Tutr character 1 - tutor with glasses" },
    { src: "/characters/character-02.png", alt: "Tutr character 2 - cheerful student" },
    { src: "/characters/character-03.png", alt: "Tutr character 3 - educator" },
    { src: "/characters/character-04.png", alt: "Tutr character 4 - learner" },
    { src: "/characters/character-05.png", alt: "Tutr character 5 - student" },
  ];

  return (
    <div className={`flex items-center justify-center -space-x-3 ${className}`}>
      {characters.map((char, i) => (
        <div
          key={i}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-ink bg-white overflow-hidden shadow-[2px_2px_0px_#18121E] transition-transform hover:scale-110 hover:z-10"
        >
          <Image
            src={char.src}
            alt={char.alt}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Built On Trust Badge Ribbon
 */
export function BuiltOnTrustBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-3 py-1 bg-white border-2 border-ink rounded-full text-[11px] font-bold text-ink shadow-[2px_2px_0px_#18121E] uppercase tracking-wider ${className}`}
    >
      <span>BUILT ON TRUST</span>
    </div>
  );
}

export { TutrLogoBook as TutrLogo };
