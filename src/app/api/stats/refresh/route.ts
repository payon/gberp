import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { invalidateStatsCache } from "@/lib/stats-cache";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

export async function POST() {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const cleared = await invalidateStatsCache();
  return NextResponse.json({ data: { cleared } });
}
