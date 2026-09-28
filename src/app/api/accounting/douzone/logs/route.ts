import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

export async function GET(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const where: any = {};
  const status = sp.get("status");
  if (status) where.status = status;
  const limit = Math.min(Number(sp.get("limit") || "50"), 200);
  const rows = await prisma.douzoneExportLog.findMany({ where, orderBy: { requestedAt: "desc" }, take: limit });
  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      status: r.status,
      errorMessage: r.errorMessage ?? "",
      retryCount: r.retryCount,
      requestedAt: r.requestedAt,
      completedAt: r.completedAt ?? null,
    })),
  });
}
