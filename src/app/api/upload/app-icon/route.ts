import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";
import { revalidateSettings } from "@/lib/revalidate";
import { requireManager } from "@/lib/uploads";
import { generateAppIcons } from "@/lib/app-icons";
import { SECURITY_POLICY } from "@/lib/security-policy";

const MAX_SIZE = SECURITY_POLICY.upload.logoMaxBytes;

export async function POST(req: NextRequest) {
  const forbidden = await requireManager();
  if (forbidden) return forbidden;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof (file as any)?.arrayBuffer !== "function") {
    return NextResponse.json({ error: "이미지 파일(.png/.jpg)을 첨부해주세요." }, { status: 400 });
  }
  const contentType = (file as File).type || "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
  }
  const buf = Buffer.from(await (file as File).arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기가 올바르지 않습니다. (최대 5MB, 512×512 이상 정사각형)" }, { status: 400 });
  }

  try {
    const generated = await generateAppIcons(buf);
    await saveSettings({
      "pwa.iconPath": generated.iconPath,
      "pwa.iconUpdatedAt": generated.updatedAt,
    });
    revalidateSettings();
    return NextResponse.json({ data: generated }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "아이콘 생성에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE() {
  const forbidden = await requireManager();
  if (forbidden) return forbidden;

  const settings = await getSettings();
  void settings;
  await saveSettings({ "pwa.iconPath": "", "pwa.iconUpdatedAt": "" });
  revalidateSettings();
  return NextResponse.json({ ok: true });
}
