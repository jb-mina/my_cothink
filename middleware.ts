import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.APP_PASSWORD || "";

function role(cookie: string | undefined): "admin" | "user" | "none" {
  if (!cookie) return "none";
  if (PASSWORD && cookie === PASSWORD) return "admin";
  if (cookie.startsWith("u:")) return "user";
  return "none";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes — handled per-route. Public: /api/login, /api/invitation-request.
  // query/synthesize remain accessible; full auth on those is deferred to a later PR.
  if (pathname.startsWith("/api")) return NextResponse.next();

  // Always public pages
  if (pathname === "/landing") return NextResponse.next();
  if (pathname === "/login") return NextResponse.next();

  const r = role(req.cookies.get("cothink_auth")?.value);

  // /admin is admin-only (also re-checked in the page and server action)
  if (pathname === "/admin") {
    if (r === "admin") return NextResponse.next();
    return NextResponse.redirect(new URL(r === "user" ? "/" : "/landing", req.url));
  }

  // Root: unauthenticated visitors see the landing at the same URL
  if (pathname === "/") {
    if (r === "none") return NextResponse.rewrite(new URL("/landing", req.url));
    return NextResponse.next();
  }

  // Everything else: signed-in (admin or user) pass; others bounce to landing
  if (r === "none") return NextResponse.redirect(new URL("/landing", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
