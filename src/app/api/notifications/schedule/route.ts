import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { SECURITY_POLICY } from "@/lib/security-policy";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "OPERATOR"];
const CHANNELS = ["SMS", "EMAIL", "PUSH", "IN_APP"];

export async function POST(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  const { targetType, targetId, channel, title, message, scheduledAt, targetPhone, targetEmail, data } = body ?? {};
  if (!targetType || !targetId || !title || !message) {
    return NextResponse.json({ error: "대상·제목·본문이 필요합니다." }, { status: 400 });
  }
  if (!CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "지원하지 않는 채널입니다." }, { status: 400 });
  }
  let when: Date | null = null;
  if (scheduledAt) {
    when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) return NextResponse.json({ error: "예약 시각이 올바르지 않습니다." }, { status: 400 });
  }
  const row = await prisma.notificationQueue.create({
    data: {
      targetType: String(targetType),
      targetId: String(targetId),
      targetPhone: targetPhone ? String(targetPhone) : null,
      targetEmail: targetEmail ? String(targetEmail) : null,
      channel,
      title: String(title).slice(0, SECURITY_POLICY.notify.smsTitleMax),
      message: String(message).slice(0, SECURITY_POLICY.notify.smsMessageMax),
      data: data ? String(data).slice(0, SECURITY_POLICY.notify.smsDataMax) : null,
      scheduledAt: when,
      status: "PENDING",
    },
  });
  await auditLog({
    userId: user!.id,
    userName: user!.name ?? "",
    action: "CREATE",
    tableName: "notification_queue",
    recordId: row.id,
    newValue: JSON.stringify({ channel, targetType, targetId, scheduledAt: when }),
  });
  return NextResponse.json({ data: { id: row.id, status: row.status } }, { status: 201 });
}
