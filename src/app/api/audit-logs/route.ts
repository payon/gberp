import { NextRequest, NextResponse } from "next/server";
import { AuditAction, UserRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

export async function GET(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, [UserRole.SUPER_ADMIN, UserRole.ADMIN])) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") || undefined;
  const table = sp.get("table") || undefined;
  const q = sp.get("q")?.trim() || undefined;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(Number(sp.get("offset")) || 0, 0);

  const where: Prisma.AuditLogWhereInput = {};
  if (action && (Object.values(AuditAction) as string[]).includes(action)) {
    where.action = action as AuditAction;
  }
  if (table) {
    where.tableName = { contains: table };
  }
  if (q) {
    where.OR = [
      { userName: { contains: q } },
      { description: { contains: q } },
      { recordId: { contains: q } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        userId: true,
        userName: true,
        userRole: true,
        action: true,
        tableName: true,
        recordId: true,
        oldValue: true,
        newValue: true,
        description: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ data: rows, total });
}