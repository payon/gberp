import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionUser } from "@/lib/crud";
import { RESOURCE_DEFS } from "@/lib/resources";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { textCell, xlsxDownload } from "@/lib/xlsx";
import type { UserRole } from "@prisma/client";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string }> }
) {
  const { resource } = await ctx.params;
  const def = RESOURCE_DEFS[resource];
  if (!def) {
    return NextResponse.json({ error: "리소스를 찾을 수 없습니다." }, { status: 404 });
  }

  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, def.roles)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const model = (prisma as any)[def.model];
  const rows = await model.findMany({
    where: { deletedAt: null },
    include: def.include,
    orderBy: def.orderBy,
  });

  const aoa: any[][] = [def.listColumns.map((c) => c.label)];
  for (const r of rows) {
    const s = def.serialize(r);
    aoa.push(def.listColumns.map((c) => textCell(s[c.key])));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "목록");

  await auditLog({
    userId: user!.id,
    userName: user!.name,
    userRole: user!.role as UserRole,
    action: "EXPORT",
    tableName: def.model,
    description: `${def.title} 엑셀 내보내기`,
  });

  return xlsxDownload(wb, safeSegment(resource));
}

function safeSegment(name: string): string {
  return name.replace(/[^\w가-힣-]/g, "_").slice(0, 40) || "export";
}