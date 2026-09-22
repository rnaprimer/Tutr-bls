import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/role";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/student");
  }

  const role = await resolveUserRole(supabase, user.id);

  if (role === "ADMIN") {
    redirect("/admin");
  }

  if (role === "TUTOR") {
    redirect("/tutor?notice=registered_as_tutor");
  }

  if (role === "USER") {
    redirect("/select-role?next=/student");
  }

  if (role !== "STUDENT") {
    redirect("/login");
  }

  return <>{children}</>;
}
