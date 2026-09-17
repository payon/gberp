import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { featureEnabled } from "@/lib/features";
import { scheduleLabel, recommendDispatch, computeScheduleTimes, createRecommendedDispatch } from "@/lib/recommend";
import { auditLog } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "OPERATOR", "SALES"];

export async function GET(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const settings = await getSettings();
  if (!featureEnabled(settings, "semiAutoDispatch")) {
    return NextResponse.json({ error: "반자동 배차 기능이 비활성화되어 있습니다. 설정 > 기능에서 활성화하세요." }, { status: 409 });
  }

  const scheduleId = req.nextUrl.searchParams.get("scheduleId");
  if (!scheduleId) {
    return NextResponse.json({ error: "일정(scheduleId)이 필요합니다." }, { status: 400 });
  }

  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { product: true, client: true, dispatches: { where: { deletedAt: null }, select: { id: true } } },
  });
  if (!schedule || schedule.deletedAt) {
    return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
  }
  if (schedule.dispatches.length > 0) {
    return NextResponse.json({ error: "이미 배차가 생성된 일정입니다. 목록에서 배차를 확인해주세요." }, { status: 409 });
  }

  const { start, end } = computeScheduleTimes(schedule);
  const participants = schedule.participants || schedule.product?.maxParticipants || 1;
  const region = schedule.departureLocation || schedule.product?.region || "";

  const result = await recommendDispatch({ start, end, participants, region });

  return NextResponse.json({
    data: result,
    schedule: {
      id: schedule.id,
      label: scheduleLabel(schedule),
      start: start.toISOString(),
      end: end.toISOString(),
      participants,
    },
  });
}

export async function POST(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const settings = await getSettings();
  if (!featureEnabled(settings, "semiAutoDispatch")) {
    return NextResponse.json({ error: "반자동 배차 기능이 비활성화되어 있습니다." }, { status: 409 });
  }

  let body: { scheduleId?: string; driverId?: string; vehicleId?: string; guideId?: string | null; score?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  if (!body.scheduleId || !body.driverId || !body.vehicleId) {
    return NextResponse.json({ error: "scheduleId, driverId, vehicleId가 필요합니다." }, { status: 400 });
  }

  const schedule = await prisma.schedule.findUnique({
    where: { id: body.scheduleId },
    include: { product: true, client: true },
  });
  if (!schedule || schedule.deletedAt) {
    return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
  }

  const { start } = computeScheduleTimes(schedule);
  const participantCount = schedule.participants || schedule.product?.maxParticipants || 1;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: body.vehicleId } });
  if (!vehicle || vehicle.deletedAt || vehicle.seats < participantCount) {
    return NextResponse.json({ error: "선택한 차량은 좌석이 부족합니다." }, { status: 409 });
  }

  try {
    const { dispatch, warning } = await createRecommendedDispatch({
      schedule,
      driverId: body.driverId,
      vehicleId: body.vehicleId,
      guideId: body.guideId || null,
      score: body.score ?? 0,
      operator: { id: user!.id, name: user!.name ?? null, role: user!.role as UserRole },
    });

    await auditLog({
      userId: user!.id,
      userName: user!.name,
      userRole: user!.role as UserRole,
      action: "CREATE",
      tableName: "dispatch",
      recordId: dispatch.id,
      newValue: { autoRecommended: true, recommendationScore: dispatch.recommendationScore },
      description: "반자동 배차 생성(추천)",
    });

    return NextResponse.json({ data: { id: dispatch.id }, warning }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "배차 생성에 실패했습니다." }, { status: 409 });
  }
}