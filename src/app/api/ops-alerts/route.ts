import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { featureEnabled } from "@/lib/features";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "OPERATOR"];

export async function GET() {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const settings = await getSettings();
  if (!featureEnabled(settings, "dashboardAlert")) {
    return NextResponse.json({ error: "운영 알림 기능이 비활성화되어 있습니다." }, { status: 409 });
  }

  const now = Date.now();
  const in30d = new Date(now + 30 * 24 * 3600_000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 3600_000);

  const alerts: { id: string; severity: "danger" | "warn" | "info"; title: string; desc: string; link: string }[] = [];

  // 정산 대기
  const pendingSettlement = await prisma.settlement.count({
    where: { deletedAt: null, status: "PENDING" },
  });
  if (pendingSettlement > 0) {
    alerts.push({
      id: "settlement",
      severity: "warn",
      title: `정산 대기 ${pendingSettlement}건`,
      desc: "배차 종료로 생성된 정산 초안 중 아직 금액 입력/승인이 완료되지 않았습니다.",
      link: "/dashboard/settlements",
    });
  }

  // 차량 보험/검사 만료 임박 또는 만료
  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
  });
  const expiringVehicles = vehicles.filter((v) => {
    const dates = [v.insuranceExpiry, v.inspectionExpiry].filter(Boolean) as Date[];
    return dates.some((d) => d.getTime() <= in30d.getTime());
  });
  for (const v of expiringVehicles.slice(0, 5)) {
    const expired = (d?: Date | null) => d && d.getTime() < now;
    if (expired(v.insuranceExpiry) || expired(v.inspectionExpiry)) {
      alerts.push({
        id: `vehicle-expired-${v.id}`,
        severity: "danger",
        title: `${v.plateNumber} 만료됨`,
        desc: `보험 ${v.insuranceExpiry ? v.insuranceExpiry.toLocaleDateString("ko-KR") : "-"} / 검사 ${
          v.inspectionExpiry ? v.inspectionExpiry.toLocaleDateString("ko-KR") : "-"
        } 중 하나라도 기한이 지났습니다.`,
        link: "/dashboard/vehicles",
      });
    } else {
      alerts.push({
        id: `vehicle-soon-${v.id}`,
        severity: "warn",
        title: `${v.plateNumber} 만료 임박`,
        desc: `보험 ${v.insuranceExpiry ? v.insuranceExpiry.toLocaleDateString("ko-KR") : "-"} / 검사 ${
          v.inspectionExpiry ? v.inspectionExpiry.toLocaleDateString("ko-KR") : "-"
        } 중 하나라도 30일 내 만료됩니다.`,
        link: "/dashboard/vehicles",
      });
    }
  }

  // 기사 면허 만료 임박
  const licenseSoon = await prisma.driver.findMany({
    where: { deletedAt: null, status: { not: "RETIRED" }, licenseExpiry: { lte: in30d } },
    include: { user: true },
    take: 5,
  });
  for (const d of licenseSoon) {
    alerts.push({
      id: `license-${d.id}`,
      severity: d.licenseExpiry.getTime() < now ? "danger" : "warn",
      title: `${d.user?.name ?? "기사"} 면허 ${d.licenseExpiry.getTime() < now ? "만료" : "만료 임박"}`,
      desc: `면허 만료일 ${d.licenseExpiry.toLocaleDateString("ko-KR")}`,
      link: "/dashboard/drivers",
    });
  }

  // 오늘 배차 진행 상황
  const [todayTotal, todayInProgress] = await Promise.all([
    prisma.dispatch.count({
      where: { deletedAt: null, scheduledStart: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.dispatch.count({
      where: { deletedAt: null, status: "IN_PROGRESS" },
    }),
  ]);
  alerts.push({
    id: "today",
    severity: "info",
    title: `오늘 배차 ${todayTotal}건 중 ${todayInProgress}건 운행 중`,
    desc: todayTotal === 0 ? "오늘 예정된 배차가 없습니다." : "목록에서 배차 상태를 확인하세요.",
    link: "/dashboard/dispatches",
  });

  return NextResponse.json({ data: alerts.slice(0, 10) });
}