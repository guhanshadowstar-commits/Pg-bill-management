import { NextRequest, NextResponse } from "next/server";
import { OWNER_SESSION_COOKIE, verifyOwnerSession } from "@/lib/owner-auth";

const publicPaths = new Set(["/auth/login", "/api/auth/login", "/api/auth/logout", "/api/auth/signup"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    publicPaths.has(pathname) ||
    pathname.startsWith("/apply/") ||
    // Public tenant application submissions + slug-scoped room list.
    // Owner-only listing on this path is still enforced by requireOwner inside the route.
    pathname === "/api/applications" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  const isAuthed = await verifyOwnerSession(req.cookies.get(OWNER_SESSION_COOKIE)?.value);
  if (isAuthed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Owner login required" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/auth/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
