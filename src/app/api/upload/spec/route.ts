import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings, setting } from "@/lib/settings";
import { revalidateSettings } from "@/lib/revalidate";
import { requireManager, removeStoredFile } from "@/lib/uploads";
import { SECURITY_POLICY } from "@/lib/security-policy";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const MAX_SIZE = SECURITY_POLICY.upload.specMaxBytes;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "spec");

const ALLOWED_EXT = new Set([".pdf", ".xls", ".xlsx", ".doc", ".docx", ".hwp", ".hwpx", ".png", ".jpg", ".jpeg"]);

export async function POST(req: NextRequest) {
  const forbidden = await requireManager();
  if (forbidden) return forbidden;

  const rawName = req.headers.get("x-file-name") ?? "규격서";
  let originalName = rawName;
  try {
    originalName = decodeURIComponent(rawName);
  } catch {
    // ignore
  }
  const ext = path.extname(originalName).toLowerCase();
  if (originalName.includes("\0") || originalName.includes("..")) {
    return NextResponse.json({ error: "파일명이 올바르지 않습니다." }, { status: 400 });
  }
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "지원하지 않는 파일 형식입니다. (PDF/엑셀/한글/워드/이미지 파일만 가능)" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "파일 내용이 비어 있습니다." }, { status: 400 });
  }
  if (buf.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 20MB를 초과할 수 없습니다." }, { status: 413 });
  }

  mkdirSync(UPLOAD_DIR, { recursive: true });
  const fileName = `spec-${Date.now()}${ext}`;
  writeFileSync(path.join(UPLOAD_DIR, fileName), buf);

  const settings = await getSettings();
  const oldPath = setting(settings, "document.specPath");
  await saveSettings({
    "document.specPath": `/uploads/spec/${fileName}`,
    "document.specName": originalName.split(/[\\/]/).pop() ?? originalName,
  });
  revalidateSettings();

  removeStoredFile(UPLOAD_DIR, oldPath);

  return NextResponse.json({ path: `/uploads/spec/${fileName}`, name: originalName });
}

export async function DELETE() {
  const forbidden = await requireManager();
  if (forbidden) return forbidden;

  const settings = await getSettings();
  const oldPath = setting(settings, "document.specPath");
  await saveSettings({ "document.specPath": "", "document.specName": "" });
  revalidateSettings();
  removeStoredFile(UPLOAD_DIR, oldPath);

  return NextResponse.json({ ok: true });
}