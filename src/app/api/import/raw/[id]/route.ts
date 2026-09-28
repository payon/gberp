import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { SECURITY_POLICY } from "@/lib/security-policy";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const file = await prisma.rawImportFile.findUnique({
    where: { id },
    include: { rows: { orderBy: { rowIndex: "asc" }, take: SECURITY_POLICY.upload.rawRowTake } },
  });
  if (!file) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({
    data: {
      id: file.id,
      fileType: file.fileType,
      originalFilename: file.originalFilename,
      parsedStatus: file.parsedStatus,
      parseMessage: file.parseMessage ?? "",
      mappedTarget: file.mappedTarget ?? "",
      rows: file.rows.map((r) => ({
        id: r.id,
        sheetName: r.sheetName ?? "",
        rowIndex: r.rowIndex,
        rawJson: r.rawJson,
        mappedToTable: r.mappedToTable ?? "",
        mappedToId: r.mappedToId ?? "",
        errorMessage: r.errorMessage ?? "",
      })),
    },
  });
}
