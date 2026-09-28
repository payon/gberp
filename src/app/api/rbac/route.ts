import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { MENU } from "@/lib/permissions";
import { getSettings, saveSettings, setting } from "@/lib/settings";
import { parseRbacOverrides, rbacEditableRoles } from "@/lib/app-menus";
import { auditLog } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

const MANAGERS: UserRole[] = ["SUPER_ADMIN", "ADMIN"];
const HREFS = new Set(MENU.map((m) => m.href));

export async function GET() {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, MANAGERS)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const settings = await getSettings();
  return NextResponse.json({
    data: {
      overrides: parseRbacOverrides(setting(settings, "rbac.overrides")),
      menus: MENU.map((m) => ({ href: m.href, label: m.label, group: m.group, roles: m.roles })),
      editableRoles: rbacEditableRoles(),
    },
  });
}

export async function PUT(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  // 메뉴 권한은 최고관리자만 변경 (ADMIN의 권한 상승 차단)
  if (user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "최고관리자만 메뉴 권한을 변경할 수 있습니다." }, { status: 403 });
  }
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  const input = body?.overrides;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "overrides 객체가 필요합니다." }, { status: 400 });
  }
  const editable = new Set(rbacEditableRoles());
  const cleaned: Record<string, Record<string, boolean>> = {};
  for (const [role, perMenu] of Object.entries(input as Record<string, unknown>)) {
    if (!editable.has(role as UserRole) || !perMenu || typeof perMenu !== "object" || Array.isArray(perMenu)) continue;
    const row: Record<string, boolean> = {};
    for (const [href, allowed] of Object.entries(perMenu as Record<string, unknown>)) {
      if (!HREFS.has(href) || typeof allowed !== "boolean") continue;
      if (allowed === false) row[href] = false;
    }
    if (Object.keys(row).length > 0) cleaned[role] = row;
  }
  await saveSettings({ "rbac.overrides": JSON.stringify(cleaned) });
  await auditLog({
    userId: user!.id,
    userName: user!.name ?? "",
    userRole: user!.role as UserRole,
    action: "UPDATE",
    tableName: "app_settings",
    recordId: "rbac.overrides",
    newValue: cleaned,
    description: "메뉴 권한 변경",
  });
  return NextResponse.json({ data: { overrides: cleaned } });
}
