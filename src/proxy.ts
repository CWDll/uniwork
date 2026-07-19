import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = ["/me", "/company", "/admin"];

const roleHome = {
  admin: "/admin",
  company: "/company",
  partner: "/admin/admin-requests",
  seeker: "/me",
} as const;

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function allowedForPath(pathname: string, role: string) {
  if (pathname.startsWith("/admin")) {
    if (role === "partner") {
      return pathname === "/admin/admin-requests";
    }

    return role === "admin";
  }

  if (pathname.startsWith("/company")) {
    return role === "company" || role === "admin";
  }

  if (pathname.startsWith("/me")) {
    return role === "seeker" || role === "admin";
  }

  return true;
}

function dashboardForRole(role?: string | null) {
  if (role && role in roleHome) {
    return roleHome[role as keyof typeof roleHome];
  }

  return "/me";
}

function getLocalePath(pathname: string) {
  if (pathname === "/en") {
    return { locale: "en", pathname: "/" };
  }

  if (pathname.startsWith("/en/")) {
    return { locale: "en", pathname: pathname.slice(3) || "/" };
  }

  return { locale: "ko", pathname };
}

function localizePath(pathname: string, locale: string) {
  return locale === "en" ? `/en${pathname === "/" ? "" : pathname}` : pathname;
}

export async function proxy(request: NextRequest) {
  const localePath = getLocalePath(request.nextUrl.pathname);

  function createResponse() {
    if (localePath.locale === "en") {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = localePath.pathname;
      rewriteUrl.searchParams.set("locale", "en");

      return NextResponse.rewrite(rewriteUrl, { request });
    }

    return NextResponse.next({
      request,
    });
  }

  let response = createResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = createResponse();
          cookiesToSet.forEach(({ name, options, value }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const pathname = localePath.pathname;

  if (!isProtectedPath(pathname)) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = localizePath("/login", localePath.locale);
    redirectUrl.searchParams.set("next", localizePath(pathname, localePath.locale));
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "seeker";

  if (!allowedForPath(pathname, role)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = localizePath(dashboardForRole(role), localePath.locale);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/me/:path*", "/company/:path*", "/admin/:path*", "/en", "/en/:path*"],
};
