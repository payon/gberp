import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "SALES"];

export async function GET(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const where: any = {};
  const targetType = sp.get("targetType");
  const targetId = sp.get("targetId");
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;
  const limit = Math.min(Number(sp.get("limit") || "50"), 200);
  const rows = await prisma.documentOutputHistory.findMany({
    where,
    orderBy: { printedAt: "desc" },
    take: limit,
  });
  const templates = await prisma.documentTemplate.findMany({
    where: { id: { in: rows.map((r) => r.templateId) } },
    select: { id: true, templateName: true, documentType: true },
  });
  const byId = new Map(templates.map((t) => [t.id, t]));
  return NextResponse.json({
    data: rows.map((r: any) => ({
      id: r.id,
      templateName: byId.get(r.templateId)?.templateName ?? "",
      documentType: byId.get(r.templateId)?.documentType ?? "",
      targetType: r.targetType,
      targetId: r.targetId,
      outputPath: r.outputPath,
      outputFormat: r.outputFormat,
      isOfficialDoc: r.isOfficialDoc,
      officialDocRef: r.officialDocRef ?? "",
      printedAt: r.printedAt,
    })),
  });
}
