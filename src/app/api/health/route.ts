import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "up",
      uptime: process.uptime(),
      latencyMs: Date.now() - started,
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, db: "down", error: e?.message ?? "DB 오류", time: new Date().toISOString() },
      { status: 503 }
    );
  }
}
