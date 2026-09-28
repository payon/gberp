import { UserRole } from "@prisma/client";
import { hasRole, MENU, type MenuItem } from "./permissions";

// 기사/가이드 앱 하단 메뉴 정의 (역할별 분리 — 모바일 앱 메뉴가 달라야 한다는 요구 반영)
export type AppMenuItem = {
  href: string;
  label: string;
  icon: "run" | "guide" | "notice" | "settings";
  roles: UserRole[];
};

export const DRIVER_APP_MENU: AppMenuItem[] = [
  { href: "/driver", label: "운행", icon: "run", roles: [UserRole.DRIVER] },
  { href: "/driver/notifications", label: "알림", icon: "notice", roles: [UserRole.DRIVER] },
  { href: "/driver/settings", label: "음성안내", icon: "settings", roles: [UserRole.DRIVER] },
];

export const GUIDE_APP_MENU: AppMenuItem[] = [
  { href: "/guide", label: "투어", icon: "guide", roles: [UserRole.GUIDE] },
  { href: "/guide/notifications", label: "알림", icon: "notice", roles: [UserRole.GUIDE] },
  { href: "/guide/settings", label: "안내설정", icon: "settings", roles: [UserRole.GUIDE] },
];

export function appMenuForRole(role: UserRole | undefined): AppMenuItem[] {
  if (role === UserRole.DRIVER) return DRIVER_APP_MENU;
  if (role === UserRole.GUIDE) return GUIDE_APP_MENU;
  return [];
}

// ---- 관리자 메뉴 오버라이드 (SA 전용 /api/rbac, AppSetting rbac.overrides) ----
// 형태: { "SALES": { "/dashboard/accounting": false } } — false만 저장, 미기재=정적 MENU 준수
export type RbacOverrides = Record<string, Record<string, boolean>>;

export function parseRbacOverrides(raw: string | null | undefined): RbacOverrides {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object" && !Array.isArray(v)) return v as RbacOverrides;
  } catch {
    // ignore
  }
  return {};
}

const EDITABLE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.OPERATOR,
  UserRole.DRIVER,
  UserRole.GUIDE,
];

export function rbacEditableRoles(): UserRole[] {
  return EDITABLE_ROLES;
}

export function isMenuAllowed(role: UserRole | undefined, href: string, overrides: RbacOverrides): boolean {
  if (!role) return false;
  if (role === UserRole.SUPER_ADMIN) return true;
  const perRole = overrides[role];
  if (perRole && perRole[href] === false) return false;
  const item = MENU.find((m) => m.href === href);
  if (!item) return true;
  return hasRole(role, item.roles);
}

export function menuForRoleWithOverrides(role: UserRole | undefined, overrides: RbacOverrides): MenuItem[] {
  return MENU.filter((m) => isMenuAllowed(role, m.href, overrides));
}
