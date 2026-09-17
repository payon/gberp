import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { DEFAULT_SETTINGS, getSettings, saveSettings } from "@/lib/settings";
import { revalidateSettings } from "@/lib/revalidate";

const MANAGER_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasRole(session.user.role as UserRole, MANAGER_ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasRole(session.user.role as UserRole, MANAGER_ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const entries: Record<string, string> = body?.settings ?? body;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    return NextResponse.json({ error: "설정 객체가 필요합니다." }, { status: 400 });
  }

  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (allowed.has(key)) clean[key] = String(value ?? "");
  }
  if (Object.keys(clean).length === 0) {
    return NextResponse.json({ error: "저장 가능한 설정이 없습니다." }, { status: 400 });
  }

  await saveSettings(clean);
  revalidateSettings();
  const settings = await getSettings();
  return NextResponse.json({ settings, saved: Object.keys(clean) });
}