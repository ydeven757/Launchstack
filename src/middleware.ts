import { NextRequest, NextResponse } from "next/server";

const VISITOR_COOKIE = "ls_vid";

function randomCookieId(len = 24): string {
  // 24 base64url chars ≈ 144 bits of entropy. Edge runtime — use crypto.
  const arr = new Uint8Array(Math.ceil(len * 3 / 4));
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString("base64url").slice(0, len);
}

/**
 * Middleware seeds the visitor cookie BEFORE any server component renders.
 * Server components cannot set cookies (only actions, route handlers, and
 * middleware can), so we set it here on the response.
 *
 * Runs only for public-facing routes that need attribution:
 *   - /p/*  (public funnel pages)
 *   - /go/* (affiliate redirects — also need the cookie for /p stitching)
 *
 * Dashboard + admin routes do not need this.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // For tenant-scoped dashboard routes, expose the full pathname to the layout
  // (Server Components can't read the URL directly in Next 14). The layout
  // uses this to redirect to /api/tenants/select with the correct deep `next`.
  if (url.pathname.startsWith("/t/")) {
    const res = NextResponse.next();
    res.headers.set("x-ls-pathname", url.pathname + url.search);
    return res;
  }

  // Public surface gets a visitor cookie seeded here (Server Components
  // can't set cookies).
  const existing = req.cookies.get(VISITOR_COOKIE)?.value;
  if (existing) return NextResponse.next();

  const res = NextResponse.next();
  const newId = randomCookieId(24);
  res.cookies.set(VISITOR_COOKIE, newId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
    secure: process.env.NODE_ENV === "production",
  });
  res.headers.set("x-ls-fresh-vid", newId);
  return res;
}

export const config = {
  matcher: ["/p/:path*", "/go/:path*", "/t/:path*"],
};
