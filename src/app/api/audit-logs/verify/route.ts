import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { verifyAuditChain } from "@/lib/audit";
import { SECURITY_POLICY } from "@/lib/security-policy";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

export async function GET() {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const result = await verifyAuditChain(SECURITY_POLICY.audit.verifyLimit);
  return NextResponse.json({ data: { ...result, intact: result.brokenAt === null } });
}
