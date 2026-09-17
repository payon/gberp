import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings, setting } from "@/lib/settings";
import { revalidateSettings } from "@/lib/revalidate";
import { requireManager, removeStoredFile } from "@/lib/uploads";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(req: NextRequest) {
  const forbidden = await requireManager();
  if (forbidden) return forbidden;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "파일 내용이 비어 있습니다." }, { status: 400 });
  }
  if (buf.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기는 5MB를 초과할 수 없습니다." }, { status: 413 });
  }

  try {
    const image = sharp(buf, { limitInputPixels: 16_000_000 });
    const meta = await image.metadata();
    if (!meta.width || !meta.height) {
      return NextResponse.json({ error: "이미지 정보를 읽을 수 없습니다." }, { status: 400 });
    }
    const resized = await image
      .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    mkdirSync(UPLOAD_DIR, { recursive: true });
    const fileName = `logo-${Date.now()}.png`;
    writeFileSync(path.join(UPLOAD_DIR, fileName), resized);

    const settings = await getSettings();
    const oldLogo = setting(settings, "company.logoPath");
    await saveSettings({ "company.logoPath": `/uploads/${fileName}` });
    revalidateSettings();

    removeStoredFile(UPLOAD_DIR, oldLogo);

    return NextResponse.json({ path: `/uploads/${fileName}` });
  } catch {
    return NextResponse.json({ error: "이미지 처리에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE() {
  const forbidden = await requireManager();
  if (forbidden) return forbidden;

  const settings = await getSettings();
  const oldLogo = setting(settings, "company.logoPath");
  await saveSettings({ "company.logoPath": "" });
  revalidateSettings();
  removeStoredFile(UPLOAD_DIR, oldLogo);

  return NextResponse.json({ ok: true });
}