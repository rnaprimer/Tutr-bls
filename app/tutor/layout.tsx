import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/role";

export default async function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/tutor");
  }

  const role = await resolveUserRole(supabase, user.id);

  if (role === "ADMIN") {
    redirect("/admin");
  }

  if (role === "STUDENT") {
    redirect("/student?notice=registered_as_student");
  }

  if (role === "USER") {
    redirect("/select-role?next=/tutor");
  }

  if (role !== "TUTOR") {
    redirect("/login");
  }

  return <>{children}</>;
}
