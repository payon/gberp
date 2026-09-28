import { UserRole } from "@prisma/client";

export const ALL_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.SALES,
  UserRole.OPERATOR,
  UserRole.DRIVER,
  UserRole.GUIDE,
];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "최고 관리자",
  ADMIN: "관리자",
  SALES: "영업사원",
  OPERATOR: "운영자",
  DRIVER: "기사",
  GUIDE: "가이드",
};

export const ROLE_BADGE: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-800",
  ADMIN: "bg-blue-100 text-blue-800",
  SALES: "bg-emerald-100 text-emerald-800",
  OPERATOR: "bg-amber-100 text-amber-800",
  DRIVER: "bg-violet-100 text-violet-800",
  GUIDE: "bg-cyan-100 text-cyan-800",
};

export function hasRole(role: UserRole | undefined, allowed: UserRole[]): boolean {
  if (!role) return false;
  if (role === UserRole.SUPER_ADMIN) return true;
  if (!allowed.includes(role)) return false;
  return true;
}

export type MenuItem = {
  href: string;
  label: string;
  group: string;
  roles: UserRole[];
  badge?: string;
};

export const MENU: MenuItem[] = [
  { href: "/dashboard", label: "대시보드", group: "업무", roles: ALL_ROLES },
  { href: "/dashboard/clients", label: "고객/거래처", group: "업무", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES] },
  { href: "/dashboard/products", label: "상품 관리", group: "업무", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES, UserRole.OPERATOR] },
  { href: "/dashboard/schedules", label: "일정 관리", group: "업무", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES, UserRole.OPERATOR] },
  { href: "/dashboard/contracts", label: "견적/계약", group: "업무", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES, UserRole.OPERATOR] },
  { href: "/dashboard/dispatches", label: "배차 관리", group: "운영", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.SALES] },
  { href: "/dashboard/vehicles", label: "차량 관리", group: "운영", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/dashboard/drivers", label: "기사 관리", group: "운영", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/dashboard/guides", label: "가이드 관리", group: "운영", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR] },
  { href: "/dashboard/accounting", label: "회계 관리", group: "정산·회계", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { href: "/dashboard/settlements", label: "정산 관리", group: "정산·회계", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { href: "/dashboard/reports", label: "통계/리포트", group: "정산·회계", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES] },
  { href: "/dashboard/notifications", label: "알림 전파", group: "업무", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.SALES] },
  { href: "/dashboard/documents", label: "문서 출력", group: "업무", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES] },
  { href: "/dashboard/settings", label: "업체 설정", group: "시스템", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { href: "/dashboard/audit-logs", label: "감사 로그", group: "시스템", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
  { href: "/dashboard/users", label: "사용자/권한", group: "시스템", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
];

export function menuForRole(role: UserRole | undefined): MenuItem[] {
  return MENU.filter((m) => hasRole(role, m.roles));
}

export function canAccessModule(pathname: string, role: UserRole | undefined): boolean {
  const segments = pathname.split("/").filter(Boolean); // ["dashboard", "clients"]
  if (segments.length === 0) return false;
  // 기사/가이드 앱은 교차 접근 금지 (DRIVER↔GUIDE). 미리보기는 SA/ADMIN만.
  if (segments[0] === "driver") return role === UserRole.DRIVER || hasRole(role, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  if (segments[0] === "guide") return role === UserRole.GUIDE || hasRole(role, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  if (segments[0] !== "dashboard") return true;
  const moduleName = segments[1];
  if (!moduleName) return role !== undefined;
  const item = MENU.find((m) => m.href === `/dashboard/${moduleName}`);
  if (!item) return true;
  return hasRole(role, item.roles);
}