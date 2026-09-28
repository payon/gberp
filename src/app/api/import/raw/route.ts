import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { featureEnabled } from "@/lib/features";
import { auditLog } from "@/lib/audit";
import { detectFileType, parseExcel, parseHwpx } from "@/lib/raw-import";
import { SECURITY_POLICY } from "@/lib/security-policy";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];
const MAX_SIZE = SECURITY_POLICY.upload.specMaxBytes;
const ALLOWED_EXT = new Set([".xlsx", ".xls", ".hwpx", ".hwp", ".pdf"]);
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "raw");

function safeName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\-가-힣() ]/g, "_").slice(0, 80);
  return `${Date.now()}-${base || "upload"}`;
}

export async function GET() {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const files = await prisma.rawImportFile.findMany({
    orderBy: { uploadedAt: "desc" },
    take: 100,
    include: { _count: { select: { rows: true } } },
  });
  return NextResponse.json({
    data: files.map((f: any) => ({
      id: f.id,
      fileType: f.fileType,
      originalFilename: f.originalFilename,
      filePath: f.filePath,
      fileSize: f.fileSize,
      parsedStatus: f.parsedStatus,
      parseMessage: f.parseMessage ?? "",
      mappedTarget: f.mappedTarget ?? "",
      rowCount: f._count.rows,
      uploadedAt: f.uploadedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const settings = await getSettings();
  if (!featureEnabled(settings, "excelImport")) {
    return NextResponse.json({ error: "엑셀 가져오기 기능이 비활성화되어 있습니다. 설정 > 기능에서 활성하세요." }, { status: 409 });
  }
  const form = await req.formData();
  const file = form.get("file");
  const mappedTarget = form.get("mappedTarget");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  const originalName = (file as any).name ? String((file as any).name) : "upload";
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json({ error: "지원하지 않는 파일 형식입니다. (.xlsx/.xls/.hwpx/.hwp/.pdf)" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기가 올바르지 않습니다. (최대 20MB)" }, { status: 400 });
  }

  mkdirSync(UPLOAD_DIR, { recursive: true });
  const stored = safeName(originalName);
  writeFileSync(path.join(UPLOAD_DIR, stored), buf);
  const fileType = detectFileType(ext);

  const record = await prisma.rawImportFile.create({
    data: {
      fileType,
      originalFilename: originalName,
      filePath: `/uploads/raw/${stored}`,
      fileSize: buf.byteLength,
      uploadedBy: user!.id,
      parsedStatus: "PENDING",
      mappedTarget: mappedTarget ? String(mappedTarget) : null,
    },
  });

  try {
    if (fileType === "EXCEL") {
      const rows = parseExcel(buf);
      await prisma.rawImportRow.createMany({
        data: rows.map((r) => ({
          fileId: record.id,
          sheetName: r.sheet,
          rowIndex: r.index,
          rawJson: JSON.stringify(r.data),
        })),
      });
      await prisma.rawImportFile.update({
        where: { id: record.id },
        data: { parsedStatus: "COMPLETED", parsedAt: new Date(), parseMessage: `${rows.length}행 보존` },
      });
    } else if (fileType === "HWP" && ext === ".hwpx") {
      const rows = parseHwpx(buf);
      await prisma.rawImportRow.createMany({
        data: rows.map((r) => ({
          fileId: record.id,
          sheetName: r.sheet,
          rowIndex: r.index,
          rawJson: JSON.stringify(r.data),
        })),
      });
      await prisma.rawImportFile.update({
        where: { id: record.id },
        data: { parsedStatus: "COMPLETED", parsedAt: new Date(), parseMessage: `${rows.length}문단 보존` },
      });
    } else if (fileType === "HWP") {
      await prisma.rawImportFile.update({
        where: { id: record.id },
        data: {
          parsedStatus: "PENDING",
          parseMessage: "구형 HWP 바이너리는 직접 파싱하지 않습니다. HWPX로 저장 후 업로드하세요. (원본 보존됨)",
        },
      });
    } else {
      await prisma.rawImportFile.update({
        where: { id: record.id },
        data: {
          parsedStatus: "PENDING",
          parseMessage: "PDF 텍스트 추출은 미지원입니다. 원본이 보존되며 표 데이터는 엑셀로 변환 후 등록하세요.",
        },
      });
    }
  } catch (e: any) {
    await prisma.rawImportFile.update({
      where: { id: record.id },
      data: { parsedStatus: "FAILED", parseMessage: e?.message ?? "파싱 실패" },
    });
  }

  await auditLog({
    userId: user!.id,
    userName: user!.name ?? "",
    action: "CREATE",
    tableName: "raw_import_files",
    recordId: record.id,
    newValue: JSON.stringify({ originalFilename: originalName, fileType }),
  });

  const done = await prisma.rawImportFile.findUnique({ where: { id: record.id } });
  return NextResponse.json({ data: { id: done!.id, parsedStatus: done!.parsedStatus, parseMessage: done!.parseMessage ?? "" } }, { status: 201 });
}
