import React from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { AudienceCards } from "@/components/AudienceCards";
import { TrustSection } from "@/components/TrustSection";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import type { RoleType } from "@/components/Hero";

export default async function Home() {
  let userRole: RoleType = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "ADMIN") {
        userRole = "ADMIN";
      } else if (profile?.role === "TUTOR") {
        userRole = "TUTOR";
      } else {
        const { data: tutorProf } = await supabase
          .from("tutor_profiles")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (tutorProf && tutorProf.length > 0) {
          userRole = "TUTOR";
        } else {
          const { data: tutorApp } = await supabase
            .from("tutor_applications")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (tutorApp && tutorApp.length > 0) {
            userRole = "TUTOR";
          } else {
            userRole = "STUDENT";
          }
        }
      }
    }
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
