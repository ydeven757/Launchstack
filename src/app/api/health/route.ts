import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Round-trip a trivial query — both verifies the DB is reachable and that
    // our migration state is intact.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "launchstack",
      ts: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 503 },
    );
  }
}
