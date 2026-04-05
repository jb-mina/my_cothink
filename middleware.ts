import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.APP_PASSWORD || "";

export function middleware(req: NextRequest) {
  // API routes don't need auth (already protected by needing the frontend)
  if (req.nextUrl.pathname.startsWith("/api")) return NextResponse.next();

  // Check cookie
  const cookie = req.cookies.get("cothink_auth")?.value;
  if (cookie === PASSWORD && PASSWORD !== "") return NextResponse.next();

  // Check if this is the login POST (form submission)
  if (req.method === "POST" && req.nextUrl.pathname === "/login") return NextResponse.next();

  // Redirect to login
  if (req.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
