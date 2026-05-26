import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { ACTIVE_TENANT_COOKIE } from "@/server/tenant";

/**
 * Route Handler — sets the active-tenant cookie + redirects.
 *
 * Server Components can't write cookies, so when the tenant layout
 * notices the cookie is missing or stale, it 307s here. We verify
 * membership, write the cookie on the response, then redirect to
 * the requested next URL (defaulting to /t/<slug>).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const slug = url.searchParams.get("slug");
  const next = url.searchParams.get("next") ?? "/app";

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(next)}`, req.url), 307);
  }

  const tenant = await prisma.tenant.findFirst({
    where: id ? { id } : slug ? { slug } : { id: "__none__" },
  });
  if (!tenant) return NextResponse.redirect(new URL("/app", req.url), 307);

  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
  });
  if (!membership && !user.isSuperAdmin) {
    return NextResponse.redirect(new URL("/app", req.url), 307);
  }

  // Resolve next URL — only allow internal paths
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : `/t/${tenant.slug}`;

  const res = NextResponse.redirect(new URL(safeNext, req.url), 307);
  res.cookies.set(ACTIVE_TENANT_COOKIE, tenant.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
