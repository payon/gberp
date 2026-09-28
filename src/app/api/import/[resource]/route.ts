import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { RESOURCE_DEFS, type ResourceDef, type FieldDef } from "@/lib/resources";
import { getSettings } from "@/lib/settings";
import { featureEnabled } from "@/lib/features";
import { auditLog } from "@/lib/audit";
import { notifyDispatchCreated } from "@/lib/notify";
import { buildData, validateRequired } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { SECURITY_POLICY } from "@/lib/security-policy";
import type { UserRole } from "@prisma/client";

function headerMapFor(sheet: any, def: ResourceDef): { header: string; field: FieldDef }[] {
  const map: { header: string; field: FieldDef }[] = [];
  if (!Array.isArray(sheet) || sheet.length === 0) return map;
  const first = sheet[0];
  if (!first || typeof first !== "object") return map;

  for (const h of Object.keys(first)) {
    const clean = String(h).trim();
    const field = def.fields.find(
      (f) => f.label === clean || f.key === clean || clean.endsWith(`(${f.key})`)
    );
    if (field) map.push({ header: h, field });
  }
  return map;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ resource: string }> }
) {
  const { resource } = await ctx.params;
  const def = RESOURCE_DEFS[resource];
  if (!def) return NextResponse.json({ error: "리소스를 찾을 수 없습니다." }, { status: 404 });

  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, def.roles)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const settings = await getSettings();
  if (!featureEnabled(settings, "excelImport")) {
    return NextResponse.json({ error: "엑셀 일괄 등록 기능이 비활성화되어 있습니다." }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof (file as any)?.arrayBuffer !== "function") {
    return NextResponse.json({ error: "엑셀 파일(.xlsx/.xls)을 첨부해주세요." }, { status: 400 });
  }

  const MAX_FILE_BYTES = SECURITY_POLICY.upload.importMaxBytes;
  const MAX_ROWS = SECURITY_POLICY.upload.importMaxRows;
  let wb: XLSX.WorkBook;
  try {
    const buf = Buffer.from(await (file as File).arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "파일 크기가 올바르지 않습니다. (최대 10MB)" }, { status: 400 });
    }
    wb = XLSX.read(buf, { type: "buffer" });
  } catch {
    return NextResponse.json({ error: "엑셀 파일을 읽지 못했습니다." }, { status: 400 });
  }

  const wsName = wb.SheetNames[0];
  if (!wsName) return NextResponse.json({ error: "파일에 시트가 없습니다." }, { status: 400 });
  const sheet = XLSX.utils.sheet_to_json(wb.Sheets[wsName], { defval: "", raw: true });
  if (!Array.isArray(sheet) || sheet.length === 0) {
    return NextResponse.json({ error: "데이터 행이 없습니다." }, { status: 400 });
  }
  if (sheet.length > MAX_ROWS) {
    return NextResponse.json({ error: `한 번에 최대 ${MAX_ROWS}행까지 등록할 수 있습니다.` }, { status: 400 });
  }

  const colMap = headerMapFor(sheet as any, def);
  const createdCount = { n: 0 };
  const failed: { row: number; error: string }[] = [];

  for (let i = 0; i < sheet.length; i++) {
    const rawRow: any = sheet[i];
    let empty = true;
    for (const key in rawRow) {
      if (rawRow[key] !== "" && rawRow[key] !== undefined) {
        empty = false;
        break;
      }
    }
    if (empty) continue;

    const input: Record<string, any> = {};
    for (const { header, field } of colMap) {
      input[field.key] = rawRow[header];
    }

    try {
      let data = buildData(def, input, { forCreate: true });
      const missing = validateRequired(def, data, { forCreate: true });
      if (missing) throw new Error(missing);
      if (def.transformInput) data = def.transformInput(data);
      if (def.beforeCreate) data = await def.beforeCreate(data, user!);

      const model = (prisma as any)[def.model];
      const created = await model.create({ data });
      await auditLog({
        userId: user!.id,
        userName: user!.name,
        userRole: user!.role as UserRole,
        action: "CREATE",
        tableName: def.model,
        recordId: created.id,
        newValue: { source: "excelImport" },
        description: "엑셀 일괄 등록",
      });
      if (def.model === "dispatch") {
        try {
          await notifyDispatchCreated(created);
        } catch {
          // SMS 알림 실패 무시
        }
      }
      createdCount.n += 1;
    } catch (e: any) {
      failed.push({ row: i + 1, error: e?.message ?? "알 수 없는 오류" });
    }
  }

  if (createdCount.n === 0 && failed.length > 0) {
    return NextResponse.json(
      {
        error: "등록된 행이 없습니다.",
        data: { created: 0, failed },
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    data: { created: createdCount.n, failed, total: sheet.length },
  });
}