import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, GraduationCap, MapPin, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/role";
import { TutrLogoBook } from "@/components/TutrIllustrations";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Choose Your Role — Tutr Balasore",
  description: "Select whether you are joining Tutr as a Student or a Tutor.",
};

interface SelectRolePageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}

export default async function SelectRolePage({ searchParams }: SelectRolePageProps) {
  const { next, error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next || "/select-role")}`);
  }

  const role = await resolveUserRole(supabase, user.id);

  // Strict gatekeeper: Once a permanent role is assigned, never show role-selection again
  if (role === "ADMIN") {
    redirect("/admin");
  }
  if (role === "STUDENT") {
    redirect("/student");
  }
  if (role === "TUTOR") {
    redirect("/tutor");
  }

  // Server action to atomically reserve role
  async function selectRoleAction(formData: FormData) {
    "use server";
    const requestedRole = formData.get("role") as "STUDENT" | "TUTOR";
    if (requestedRole !== "STUDENT" && requestedRole !== "TUTOR") {
      redirect("/select-role?error=Invalid+role+selected");
    }

    const actionClient = await createClient();
    const {
      data: { user: currentUser },
    } = await actionClient.auth.getUser();

    if (!currentUser) {
      redirect("/login");
    }

    const { data: res, error: rpcError } = await actionClient.rpc("reserve_user_role", {
      p_user_id: currentUser.id,
      p_requested_role: requestedRole,
    });

    if (rpcError) {
      console.error("Error reserving role:", rpcError);
      redirect(`/select-role?error=${encodeURIComponent(rpcError.message)}`);
    }

    revalidatePath("/", "layout");

    const result = res as { role?: string; is_new?: boolean; mismatch?: boolean } | null;

    if (result?.role === "STUDENT") {
      redirect("/student");
    } else if (result?.role === "TUTOR") {
      redirect("/tutor");
    } else if (result?.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/");
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-lavender py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink font-sans">
            Tutr
          </span>
          <TutrLogoBook className="w-8 h-8 transition-transform group-hover:rotate-6" />
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white text-ink border-2 border-ink shadow-[1.5px_1.5px_0px_#18121E]">
            <MapPin className="w-3 h-3 text-coral" />
            Balasore
          </span>
        </Link>
      </header>

      {/* Main Role Selection Card */}
      <main className="flex-1 flex items-center justify-center my-8">
        <div className="max-w-xl w-full bg-white rounded-3xl border-2 border-ink p-8 sm:p-10 shadow-[5px_5px_0px_#18121E]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-ink text-ink text-xs font-bold uppercase tracking-wider shadow-[1.5px_1.5px_0px_#18121E] bg-honey-light mb-4">
              <span>Account Setup</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mb-2.5 font-sans">
              Choose Your Account Role
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed max-w-md mx-auto font-medium">
              Please choose how you want to use Tutr. Once selected, your account role will be permanently locked to this Google email.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-xs text-red-800 font-medium leading-relaxed"
            >
              <strong className="font-bold block mb-0.5">Role Reservation Notice</strong>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student Choice Card */}
            <form action={selectRoleAction} className="w-full">
              <input type="hidden" name="role" value="STUDENT" />
              <button
                type="submit"
                className="w-full p-6 text-left rounded-2xl border-2 border-ink bg-honey-light hover:bg-honey transition-all hover:translate-y-[-2px] shadow-[3px_3px_0px_#18121E] cursor-pointer flex flex-col justify-between h-full group"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white border-2 border-ink flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_#18121E]">
                    <BookOpen className="w-6 h-6 text-coral" />
                  </div>
                  <h2 className="text-base font-extrabold text-ink mb-1.5 font-sans">
                    👉 I am a Student
                  </h2>
                  <p className="text-xs text-ink/75 font-medium leading-relaxed">
                    Find and connect with trusted, verified tutors across Balasore localities.
                  </p>
                </div>
                <span className="text-xs font-bold text-ink mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Continue as Student →
                </span>
              </button>
            </form>

            {/* Tutor Choice Card */}
            <form action={selectRoleAction} className="w-full">
              <input type="hidden" name="role" value="TUTOR" />
              <button
                type="submit"
                className="w-full p-6 text-left rounded-2xl border-2 border-ink bg-purple-light hover:bg-purple-accent/30 transition-all hover:translate-y-[-2px] shadow-[3px_3px_0px_#18121E] cursor-pointer flex flex-col justify-between h-full group"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white border-2 border-ink flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_#18121E]">
                    <GraduationCap className="w-6 h-6 text-ink" />
                  </div>
                  <h2 className="text-base font-extrabold text-ink mb-1.5 font-sans">
                    👉 I am a Tutor
                  </h2>
                  <p className="text-xs text-ink/75 font-medium leading-relaxed">
                    Teach local students, build your teaching profile, and grow your tuition career.
                  </p>
                </div>
                <span className="text-xs font-bold text-ink mt-6 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Continue as Tutor →
                </span>
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t-2 border-ink/10 flex items-center justify-center gap-2 text-xs font-bold text-ink-muted">
            <ShieldCheck className="w-4 h-4 text-mint-dark" />
            <span>Permanent Account Role Reservation</span>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-ink-muted font-medium">
        <p>© {new Date().getFullYear()} Tutr • Balasore, Odisha. All rights reserved.</p>
      </footer>
    </div>
  );
}
