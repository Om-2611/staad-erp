import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/unauthorized"];

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  intern: "/intern/dashboard",
  viewer: "/viewer/dashboard",
};

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    pathname === "/favicon.ico"
  );
}

/**
 * Refreshes the Supabase auth session on every request (required so server
 * components always see a valid session) AND enforces role-based route
 * protection: interns can't reach /admin or /viewer, viewers can't reach
 * /admin or /intern, etc.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isPublicPath(pathname) || pathname === "/") {
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      return response;
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in — fetch role once per request (cheap, indexed PK lookup).
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, has_intern_access")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") {
    // No profile row yet, or account deactivated by admin. Avoid a redirect
    // loop if they're already looking at the unauthorized page.
    if (pathname === "/unauthorized") return response;
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  const home = ROLE_HOME[profile.role] ?? "/login";

  if (pathname === "/" || pathname === "/login") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  const wantsAdmin = pathname.startsWith("/admin");
  const wantsIntern = pathname.startsWith("/intern");
  const wantsViewer = pathname.startsWith("/viewer");

  // An admin with has_intern_access (e.g. a co-founder who also tracks their
  // own attendance/tasks) can reach /intern/* in addition to /admin/*.
  const allowed =
    (wantsAdmin && profile.role === "admin") ||
    (wantsIntern && (profile.role === "intern" || (profile.role === "admin" && profile.has_intern_access))) ||
    (wantsViewer && profile.role === "viewer") ||
    (!wantsAdmin && !wantsIntern && !wantsViewer);

  if (!allowed) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return response;
}
