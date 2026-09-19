import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeNextUrl } from "@/lib/supabase/middleware";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next");

  // Sanitize the destination URL to prevent open redirect vulnerabilities
  const destination = sanitizeNextUrl(next);

  // Helper to build redirect URLs that respect configured app URL, proxies (e.g. Vercel), or request origin
  const buildRedirectUrl = (path: string, params?: Record<string, string>) => {
    let baseUrl: string;
    if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
    } else {
      const forwardedHost = request.headers.get("x-forwarded-host");
      if (forwardedHost && process.env.NODE_ENV !== "development") {
        baseUrl = `https://${forwardedHost}`;
      } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`.replace(/\/+$/, "");
      } else {
        baseUrl = new URL(request.url).origin;
      }
    }

    const url = new URL(path, baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    return url;
  };

  // Handle OAuth provider cancellation or error
  if (error) {
    console.error("OAuth Error from provider:", error, errorDescription);
    const loginUrl = buildRedirectUrl("/login", {
      error: errorDescription || "Google sign-in was cancelled or could not be completed.",
      next: destination,
    });
    return NextResponse.redirect(loginUrl);
  }

  // If no authorization code is provided, redirect to login with error
  if (!code) {
    const loginUrl = buildRedirectUrl("/login", {
      error: "No authorization code was provided by the authentication provider.",
      next: destination,
    });
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Session exchange error:", exchangeError.message);
      const loginUrl = buildRedirectUrl("/login", {
        error: "Failed to establish a secure session. Please try again.",
        next: destination,
      });
      return NextResponse.redirect(loginUrl);
    }

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = buildRedirectUrl("/login", {
        error: "User identity could not be verified after session creation.",
        next: destination,
      });
      return NextResponse.redirect(loginUrl);
    }

    // Redirect to the validated, sanitized destination
    const destinationUrl = buildRedirectUrl(destination);
    return NextResponse.redirect(destinationUrl);
  } catch (err) {
    console.error("Unexpected callback error:", err);
    const loginUrl = buildRedirectUrl("/login", {
      error: "An unexpected error occurred during authentication. Please try again.",
      next: destination,
    });
    return NextResponse.redirect(loginUrl);
  }
}
