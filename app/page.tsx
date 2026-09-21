import React from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { AudienceCards } from "@/components/AudienceCards";
import { TrustSection } from "@/components/TrustSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender selection:bg-purple-accent selection:text-ink">
      <Navbar />

      <main>
        {/* Hero Section */}
        <Hero />

        {/* How It Works 3-Step Section */}
        <HowItWorks />

        {/* Student / Tutor Split Cards Section */}
        <AudienceCards />

        {/* Trust & Simplicity Pillars Section */}
        <TrustSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
