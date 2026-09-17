import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { featureEnabled } from "@/lib/features";
import { DISPATCH_STATUS_LABELS, statusVariant } from "@/lib/resources";
import type { DispatchStatus, UserRole } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  if (role !== "DRIVER" && role !== "GUIDE") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: { action?: string; runLog?: { startOdometer?: number; endOdometer?: number; notes?: string; issues?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const action = body?.action;
  if (action !== "start" && action !== "end") {
    return NextResponse.json(
      { error: '"action"은 start 또는 end 여야 합니다.' },
      { status: 400 }
    );
  }

  const settings = await getSettings();
  const runLogOn = featureEnabled(settings, "runLog");
  const autoSettlementOn = featureEnabled(settings, "autoSettlement");

  const dispatch = await prisma.dispatch.findUnique({ where: { id } });
  if (!dispatch || dispatch.deletedAt) {
    return NextResponse.json({ error: "배차를 찾을 수 없습니다." }, { status: 404 });
  }

  const profile =
    role === "DRIVER"
      ? await prisma.driver.findUnique({ where: { userId: session.user.id }, include: { user: true } })
      : await prisma.guide.findUnique({ where: { userId: session.user.id }, include: { user: true } });

  if (!profile) {
    return NextResponse.json({ error: "프로필이 없습니다." }, { status: 404 });
  }

  const owns =
    (role === "DRIVER" && dispatch.driverId === profile.id) ||
    (role === "GUIDE" && dispatch.guideId === profile.id);

  if (!owns) {
    return NextResponse.json({ error: "본인 배차가 아닙니다." }, { status: 403 });
  }

  const nextStatus: DispatchStatus = (action === "start" ? "IN_PROGRESS" : "COMPLETED") as DispatchStatus;
  if (action === "start" && dispatch.status !== "PENDING" && dispatch.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "운행을 시작할 수 없는 상태입니다." },
      { status: 409 }
    );
  }
  if (action === "end" && dispatch.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "운행을 종료할 수 없는 상태입니다." },
      { status: 409 }
    );
  }
  if (action === "end" && runLogOn && !body.runLog) {
    return NextResponse.json(
      { error: "RUN_LOG_REQUIRED" },
      { status: 400 }
    );
  }

  const data =
    action === "start"
      ? { status: nextStatus, actualStart: new Date() }
      : { status: nextStatus, actualEnd: new Date() };

  try {
    const updated = await prisma.dispatch.update({ where: { id }, data });
    await auditLog({
      userId: session.user.id,
      userName: session.user.name,
      userRole: role,
      action: "UPDATE",
      tableName: "dispatch",
      recordId: id,
      oldValue: { status: dispatch.status },
      newValue: { status: nextStatus },
      description: action === "start" ? "기사/가이드 운행 시작" : "기사/가이드 운행 종료",
    });

    if (action === "start") {
      try {
        if (role === "DRIVER") {
          await prisma.driver.update({ where: { id: profile.id }, data: { status: "ON_DUTY" } });
        } else {
          await prisma.guide.update({ where: { id: profile.id }, data: { status: "ON_TOUR" } });
        }
      } catch {
        // 상태 갱신 실패는 치명적이지 않음
      }
      if (runLogOn && role === "DRIVER") {
        try {
          await upsertWorkLog(dispatch.id, profile.id, { startTime: new Date() });
        } catch {
          // 운행일지 기록 실패 무시
        }
      }
    } else {
      try {
        if (role === "DRIVER") {
          await prisma.driver.update({ where: { id: profile.id }, data: { status: "AVAILABLE" } });
        } else {
          await prisma.guide.update({ where: { id: profile.id }, data: { status: "AVAILABLE" } });
        }
      } catch {
        // 상태 갱신 실패는 치명적이지 않음
      }

      if (runLogOn && role === "DRIVER") {
        try {
          await upsertWorkLog(dispatch.id, profile.id, {
            endTime: new Date(),
            endOdometer: toInt(body.runLog?.endOdometer),
            startOdometer: toInt(body.runLog?.startOdometer),
            notes: body.runLog?.notes || null,
            issues: body.runLog?.issues ? JSON.stringify({ fuel: null, remark: body.runLog.issues }) : null,
          });
        } catch {
          // 운행일지 기록 실패 무시
        }
      }

      if (autoSettlementOn) {
        try {
          await ensureAutoSettlement(dispatch, profile as any, role);
        } catch {
          // 정산 초안 생성 실패 무시 (다음 종료 시 재시도 X)
        }
      }
    }

    return NextResponse.json({
      data: serialize(updated),
      features: { runLog: runLogOn, autoSettlement: autoSettlementOn },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

function toInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

async function upsertWorkLog(
  dispatchId: string,
  driverId: string,
  patch: { startTime?: Date; endTime?: Date; startOdometer?: number | null; endOdometer?: number | null; notes?: string | null; issues?: string | null }
) {
  const existing = await prisma.driverWorkLog.findFirst({
    where: { dispatchId, driverId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    await prisma.driverWorkLog.update({
      where: { id: existing.id },
      data: {
        ...(patch.startTime ? { startTime: patch.startTime } : {}),
        ...(patch.endTime ? { endTime: patch.endTime } : {}),
        ...(patch.startOdometer ?? undefined) !== undefined ? { startOdometer: patch.startOdometer } : {},
        ...(patch.endOdometer ?? undefined) !== undefined ? { endOdometer: patch.endOdometer } : {},
        ...(patch.notes || existing.notes ? { notes: patch.notes ?? existing.notes } : {}),
        ...(patch.issues ? { issues: patch.issues } : {}),
        status: patch.endTime ? "ENDED" : "STARTED",
      },
    });
  } else {
    await prisma.driverWorkLog.create({
      data: {
        dispatchId,
        driverId,
        startTime: patch.startTime ?? new Date(),
        endTime: patch.endTime ?? null,
        startOdometer: patch.startOdometer ?? null,
        endOdometer: patch.endOdometer ?? null,
        notes: patch.notes ?? null,
        issues: patch.issues ?? null,
        status: patch.endTime ? "ENDED" : "STARTED",
      },
    });
  }
}

async function ensureAutoSettlement(
  dispatch: any,
  profile: { id: string; user?: { name?: string | null } | null },
  role: UserRole
) {
  const name = profile.user?.name || "정산 대상";
  const type = role === "DRIVER" ? "DRIVER" : "GUIDE";

  const dup = await prisma.settlement.findFirst({
    where: { details: { contains: dispatch.id } },
  });
  if (dup) return; // 같은 배차로 이미 생성된 정산이 있으면 건너뜀

  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const count = await prisma.settlement.count({
    where: { settlementNumber: { startsWith: `S-${ymd}` } },
  });

  const startDate = dispatch.scheduledStart ?? new Date();
  const endDate = dispatch.scheduledEnd ?? startDate;

  await prisma.settlement.create({
    data: {
      settlementNumber: `S-${ymd}-${String(count + 1).padStart(3, "0")}`,
      settlementDate: startDate,
      settlementEndDate: endDate,
      settlementType: type as any,
      targetId: profile.id,
      targetName: name,
      details: JSON.stringify({
        dispatchId: dispatch.id,
        driverName: role === "DRIVER" ? name : null,
        guideName: role === "GUIDE" ? name : null,
        actualStart: dispatch.actualStart ?? null,
        actualEnd: dispatch.actualEnd ?? null,
      }),
      status: "PENDING",
      notes: "배차 종료 시 자동 생성된 정산 초안 (금액 입력 필요)",
    },
  });
}

function serialize(d: any) {
  return {
    id: d.id,
    status: d.status,
    statusLabel: DISPATCH_STATUS_LABELS[d.status] ?? d.status,
    statusVariant: statusVariant(d.status),
    actualStart: d.actualStart,
    actualEnd: d.actualEnd,
  };
}