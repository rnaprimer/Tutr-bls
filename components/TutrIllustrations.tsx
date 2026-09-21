import React from "react";

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
 * Hero Left Illustration: Framed card with tutor man and dog in chair
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
          {/* Upper portrait: bearded tutor */}
          <div className="w-20 h-20 rounded-full bg-white border-2 border-ink flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_#18121E]">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Hair & head */}
              <circle cx="50" cy="40" r="22" fill="#FAF7F2" stroke="#18121E" strokeWidth="2.5" />
              <path d="M30 36C30 20 40 16 50 16C60 16 70 20 70 36C70 30 64 26 50 26C36 26 30 30 30 36Z" fill="#18121E" />
              {/* Beard */}
              <path d="M36 44C36 56 42 64 50 64C58 64 64 56 64 44C60 48 56 50 50 50C44 50 40 48 36 44Z" fill="#18121E" />
              {/* Eyes & smile */}
              <circle cx="43" cy="38" r="2.5" fill="#18121E" />
              <circle cx="57" cy="38" r="2.5" fill="#18121E" />
              <path d="M47 46C49 48 51 48 53 46" stroke="#FAF7F2" strokeWidth="2" strokeLinecap="round" />
              {/* Glasses */}
              <circle cx="43" cy="38" r="6" fill="none" stroke="#18121E" strokeWidth="2" />
              <circle cx="57" cy="38" r="6" fill="none" stroke="#18121E" strokeWidth="2" />
              <path d="M49 38H51" stroke="#18121E" strokeWidth="2" />
              {/* Body */}
              <path d="M22 92C24 72 36 68 50 68C64 68 76 72 78 92" fill="#F6BD75" stroke="#18121E" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Lower portrait: cozy dog in chair */}
          <div className="w-28 h-24 rounded-2xl bg-white border-2 border-ink flex items-center justify-center p-2 relative shadow-[2px_2px_0px_#18121E]">
            <svg viewBox="0 0 100 80" className="w-full h-full">
              {/* Armchair back */}
              <path d="M15 70V28C15 20 22 14 30 14H70C78 14 85 20 85 28V70" fill="#F28F85" stroke="#18121E" strokeWidth="2.5" />
              {/* Dog head */}
              <ellipse cx="50" cy="38" rx="16" ry="14" fill="#FAF7F2" stroke="#18121E" strokeWidth="2.5" />
              {/* Dog ears */}
              <path d="M36 30L30 14L40 24" fill="#18121E" stroke="#18121E" strokeWidth="2" strokeLinejoin="round" />
              <path d="M64 30L70 14L60 24" fill="#18121E" stroke="#18121E" strokeWidth="2" strokeLinejoin="round" />
              {/* Dog face */}
              <circle cx="45" cy="36" r="2" fill="#18121E" />
              <circle cx="55" cy="36" r="2" fill="#18121E" />
              <ellipse cx="50" cy="42" rx="3.5" ry="2.5" fill="#18121E" />
              {/* Snug sweater */}
              <path d="M30 68C32 50 40 48 50 48C60 48 68 50 70 68" fill="#FAF7F2" stroke="#18121E" strokeWidth="2" />
              {/* Stripes on sweater */}
              <path d="M35 56H65" stroke="#18121E" strokeWidth="1.5" strokeDasharray="2 2" />
              <path d="M38 62H62" stroke="#18121E" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
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
 * Hero Right Illustration: Framed card with teacher and student girl
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
          {/* Upper portrait: smiling senior teacher & child */}
          <div className="w-28 h-20 rounded-2xl bg-white border-2 border-ink flex items-center justify-center p-1.5 shadow-[2px_2px_0px_#18121E]">
            <svg viewBox="0 0 100 65" className="w-full h-full">
              {/* Grandpa teacher */}
              <circle cx="36" cy="28" r="14" fill="#FAF7F2" stroke="#18121E" strokeWidth="2" />
              <path d="M24 24C24 16 30 14 36 14C42 14 48 16 48 24" stroke="#18121E" strokeWidth="2" fill="none" />
              <circle cx="32" cy="27" r="1.5" fill="#18121E" />
              <circle cx="40" cy="27" r="1.5" fill="#18121E" />
              <circle cx="32" cy="27" r="4" fill="none" stroke="#18121E" strokeWidth="1.5" />
              <circle cx="40" cy="27" r="4" fill="none" stroke="#18121E" strokeWidth="1.5" />
              <path d="M34 35C35 37 37 37 38 35" stroke="#18121E" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M18 64C20 48 28 44 36 44C44 44 48 48 50 64" fill="#CBB7F0" stroke="#18121E" strokeWidth="2" />

              {/* Cheerful student kid */}
              <circle cx="68" cy="30" r="12" fill="#FAF7F2" stroke="#18121E" strokeWidth="2" />
              <path d="M58 24C60 16 68 18 78 22" stroke="#18121E" strokeWidth="2" fill="none" />
              {/* Pigtails */}
              <path d="M56 26C52 24 50 28 54 32" stroke="#18121E" strokeWidth="2" fill="#18121E" />
              <path d="M80 26C84 24 86 28 82 32" stroke="#18121E" strokeWidth="2" fill="#18121E" />
              <circle cx="65" cy="29" r="1.5" fill="#18121E" />
              <circle cx="72" cy="29" r="1.5" fill="#18121E" />
              <path d="M66 35C68 38 71 38 73 35" stroke="#18121E" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M54 64C56 50 62 44 70 44C78 44 84 50 86 64" fill="#F28F85" stroke="#18121E" strokeWidth="2" />
            </svg>
          </div>

          {/* Lower portrait: girl student with long dark hair */}
          <div className="w-20 h-24 rounded-full bg-white border-2 border-ink flex items-center justify-center overflow-hidden shadow-[2px_2px_0px_#18121E]">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Hair background */}
              <path d="M26 35C22 55 20 75 30 85H70C80 75 78 55 74 35C74 15 62 12 50 12C38 12 26 15 26 35Z" fill="#18121E" />
              {/* Head */}
              <circle cx="50" cy="44" r="20" fill="#FAF7F2" stroke="#18121E" strokeWidth="2.5" />
              {/* Hair bangs */}
              <path d="M32 40C38 30 46 32 50 34C54 32 62 30 68 40" stroke="#18121E" strokeWidth="2.5" fill="#18121E" />
              {/* Face */}
              <circle cx="44" cy="44" r="2.5" fill="#18121E" />
              <circle cx="56" cy="44" r="2.5" fill="#18121E" />
              <path d="M47 52C49 55 51 55 53 52" stroke="#18121E" strokeWidth="2" strokeLinecap="round" />
              {/* Blush */}
              <circle cx="40" cy="48" r="3" fill="#F28F85" opacity="0.6" />
              <circle cx="60" cy="48" r="3" fill="#F28F85" opacity="0.6" />
              {/* Shirt */}
              <path d="M24 95C26 76 36 70 50 70C64 70 74 76 76 95" fill="#FAF7F2" stroke="#18121E" strokeWidth="2.5" />
            </svg>
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
        {/* Left character: Boy holding tablet */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-ink p-1 shrink-0 shadow-[2.5px_2.5px_0px_#18121E]">
            <svg viewBox="0 0 80 80" className="w-full h-full">
              <circle cx="40" cy="32" r="18" fill="#FAF7F2" stroke="#18121E" strokeWidth="2" />
              <path d="M22 28C22 14 30 10 40 10C50 10 58 14 58 28" fill="#18121E" />
              <circle cx="34" cy="32" r="2" fill="#18121E" />
              <circle cx="46" cy="32" r="2" fill="#18121E" />
              <path d="M37 40C39 43 41 43 43 40" stroke="#18121E" strokeWidth="2" strokeLinecap="round" />
              <path d="M18 78C20 58 30 54 40 54C50 54 60 58 62 78" fill="#F6BD75" stroke="#18121E" strokeWidth="2" />
              {/* Tablet */}
              <rect x="28" y="52" width="24" height="20" rx="3" fill="#CBB7F0" stroke="#18121E" strokeWidth="2" />
            </svg>
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

          {/* Right character: Tutor educator pointing */}
          <div className="hidden sm:flex w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-ink p-1 shrink-0 shadow-[2.5px_2.5px_0px_#18121E]">
            <svg viewBox="0 0 80 80" className="w-full h-full">
              <circle cx="40" cy="30" r="16" fill="#FAF7F2" stroke="#18121E" strokeWidth="2" />
              <path d="M24 24C24 12 32 10 40 10C48 10 56 12 56 24" fill="#CBB7F0" />
              <circle cx="34" cy="30" r="4.5" fill="none" stroke="#18121E" strokeWidth="1.5" />
              <circle cx="46" cy="30" r="4.5" fill="none" stroke="#18121E" strokeWidth="1.5" />
              <path d="M38 30H42" stroke="#18121E" strokeWidth="1.5" />
              <circle cx="34" cy="30" r="1.5" fill="#18121E" />
              <circle cx="46" cy="30" r="1.5" fill="#18121E" />
              <path d="M37 38C39 40 41 40 43 38" stroke="#18121E" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M20 78C22 56 30 50 40 50C50 50 58 56 60 78" fill="#FFFFFF" stroke="#18121E" strokeWidth="2" />
            </svg>
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
  const avatars = [
    { bg: "#F6BD75", text: "👨‍🏫" },
    { bg: "#CBB7F0", text: "👩‍🎓" },
    { bg: "#F28F85", text: "🐶" },
    { bg: "#68CEAA", text: "👨‍🎓" },
    { bg: "#F6BD75", text: "👩‍🏫" },
  ];

  return (
    <div className={`flex items-center justify-center -space-x-3 ${className}`}>
      {avatars.map((av, i) => (
        <div
          key={i}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-ink flex items-center justify-center text-xl sm:text-2xl shadow-[2px_2px_0px_#18121E] transition-transform hover:scale-110 hover:z-10"
          style={{ backgroundColor: av.bg }}
        >
          <span>{av.text}</span>
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
