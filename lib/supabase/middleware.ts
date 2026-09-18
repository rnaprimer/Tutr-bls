import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * Validates and sanitizes destination redirects.
 * Strictly prevents open redirects to external URLs or unapproved routes.
 */
export function sanitizeNextUrl(next: string | null | undefined): string {
  if (!next) return "/";

  // Prevent protocol-relative URLs (e.g. //evil.com) or external schemes
  if (next.startsWith("//") || next.includes("://") || next.startsWith("\\")) {
    return "/";
  }

  const allowedRoutes = ["/student", "/tutor", "/admin", "/admin/applications"];
  const sanitized = next.trim();

  if (
    allowedRoutes.includes(sanitized) ||
    (sanitized.startsWith("/admin/applications/") && !sanitized.includes(".."))
  ) {
    return sanitized;
  }

  return "/";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Do NOT use supabase.auth.getSession(), use getUser() for secure server validation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedPath =
    pathname.startsWith("/student") ||
    pathname.startsWith("/tutor") ||
    pathname.startsWith("/admin");

  // If user is unauthenticated and tries to access a protected route,
  // redirect to canonical login with the sanitized next path.
  if (!user && isProtectedPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", sanitizeNextUrl(pathname));
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Preserve any updated session cookies
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value);
    });
    return redirectResponse;
  }

  // If user is already authenticated and visits /login, redirect them to their intended portal
  if (user && pathname === "/login") {
    const nextParam = request.nextUrl.searchParams.get("next");
    const destination = sanitizeNextUrl(nextParam);
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    // Preserve any updated session cookies
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
