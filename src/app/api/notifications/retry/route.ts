import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { runNotificationRetry } from "@/lib/notify-worker";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "OPERATOR"];

export async function POST() {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const result = await runNotificationRetry();
  await auditLog({
    userId: user!.id,
    userName: user!.name ?? "",
    action: "UPDATE",
    tableName: "notification_queue",
    recordId: "",
    newValue: JSON.stringify({ retry: result }),
  });
  return NextResponse.json({ data: result });
}
