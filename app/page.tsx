import React from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { AudienceCards } from "@/components/AudienceCards";
import { TrustSection } from "@/components/TrustSection";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { resolveUserRole, type RoleType } from "@/lib/auth/role";

export default async function Home() {
  let userRole: RoleType = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userRole = await resolveUserRole(supabase, user?.id);
  } catch {
    userRole = null;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender selection:bg-purple-accent selection:text-ink">
      <Navbar />

      <main>
        {/* Hero Section */}
        <Hero initialRole={userRole} />

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
