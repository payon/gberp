import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { renderDocument, type DocumentTargetType } from "@/lib/documents";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "SALES"];

export async function POST(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  const { templateId, targetType, targetId, isOfficialDoc, officialDocRef } = body ?? {};
  if (!templateId || !targetType || !targetId) {
    return NextResponse.json({ error: "템플릿과 출력 대상이 필요합니다." }, { status: 400 });
  }
  if (!["contract", "dispatch", "schedule", "client"].includes(targetType)) {
    return NextResponse.json({ error: "지원하지 않는 출력 대상입니다." }, { status: 400 });
  }
  try {
    const result = await renderDocument({
      templateId: String(templateId),
      targetType: targetType as DocumentTargetType,
      targetId: String(targetId),
      printedBy: user!.id,
      isOfficialDoc: Boolean(isOfficialDoc),
      officialDocRef: officialDocRef ? String(officialDocRef) : undefined,
    });
    await auditLog({
      userId: user!.id,
      userName: user!.name ?? "",
      action: "CREATE",
      tableName: "document_output_history",
      recordId: result.historyId,
      newValue: JSON.stringify({ templateId, targetType, targetId }),
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "문서 출력에 실패했습니다.";
    const status = /찾을 수 없습니다|사용 중지|필요합니다/.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
