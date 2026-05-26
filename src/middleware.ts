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
  // Forward to the route as if the cookie already existed — important so the
  // server component sees it on first render via cookies().get()
  res.headers.set("x-ls-fresh-vid", newId);
  return res;
}

export const config = {
  matcher: ["/p/:path*", "/go/:path*"],
};
