import { prisma } from "./prisma";
import { getSettings, setting, formatYmd, isHoliday } from "./settings";
import { restHoursWarningFor } from "./resources";

export type Candidate = {
  id: string;
  name: string;
  detail: string;
  score: number;
  reasons: string[];
};

export type TimeRange = { start: Date; end: Date };

export function computeScheduleTimes(schedule: any): TimeRange {
  const [sh = 9, sm = 0] = (schedule.startTime || "09:00").split(":").map(Number);
  const [eh = 18, em = 0] = (schedule.endTime || "18:00").split(":").map(Number);
  const start = new Date(schedule.startDate);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(schedule.endDate);
  end.setHours(eh, em, 0, 0);
  return { start, end };
}

async function hasTimeConflict(modelField: "driverId" | "vehicleId", id: string, start: Date, end: Date): Promise<boolean> {
  const hit = await prisma.dispatch.findFirst({
    where: {
      [modelField]: id,
      deletedAt: null,
      status: { notIn: ["CANCELLED", "FAILED"] },
      scheduledStart: { lte: end },
      scheduledEnd: { gte: start },
    },
  });
  return !!hit;
}

export async function recommendDispatch(input: {
  start: Date;
  end: Date;
  participants: number;
  region?: string;
}): Promise<{ drivers: Candidate[]; vehicles: Candidate[] }> {
  const { start, end, participants = 1, region = "" } = input;
  const settings = await getSettings();
  const restHours = Number(setting(settings, "dispatch.defaultRestHours"));

  // ---- 기사 후보 ----
  const drivers = await prisma.driver.findMany({
    where: { deletedAt: null, status: "AVAILABLE" },
    include: { user: true },
  });
  const driverCands: Candidate[] = [];

  for (const d of drivers) {
    if (d.user?.status !== "ACTIVE") continue;
    if (d.licenseExpiry && d.licenseExpiry.getTime() < start.getTime()) continue; // 면허 만료 제외
    if (await hasTimeConflict("driverId", d.id, start, end)) continue;

    let score = 0;
    const reasons: string[] = [];

    // 지역 매칭
    if (region && d.availableRegion) {
      if (d.availableRegion.includes(region)) {
        score += 20;
        reasons.push("활동 지역 일치");
      } else if (region.includes(d.availableRegion)) {
        score += 10;
        reasons.push("인접 지역");
      }
    }

    // 평점
    if (d.rating) {
      score += Math.round(d.rating * 4);
      reasons.push(`평점 ${d.rating.toFixed(1)}`);
    }

    // 휴게 시간
    if (restHours > 0) {
      const prev = await prisma.dispatch.findFirst({
        where: {
          driverId: d.id,
          deletedAt: null,
          status: { notIn: ["CANCELLED", "FAILED", "PENDING"] },
          scheduledEnd: { lte: start },
        },
        orderBy: { scheduledEnd: "desc" },
      });
      if (prev?.scheduledEnd) {
        const gapHours = (start.getTime() - new Date(prev.scheduledEnd).getTime()) / 3600_000;
        if (gapHours >= restHours) {
          score += 8;
          reasons.push(`휴게 ${Math.floor(gapHours)}h 확보`);
        } else {
          score = Math.max(0, score - 15);
          reasons.push(`휴게 부족 ${Math.floor(gapHours)}h`);
        }
      } else {
        score += 8;
        reasons.push("휴게 여유");
      }
    }

    // 야근 배려: 이른 아침/늦은 밤 배차는 야근 비허용 기사 우선 배제
    const hour = start.getHours();
    const isNightShift = hour < 6 || hour >= 22;
    if (isNightShift && !d.overtimeAllowed) {
      score = Math.max(0, score - 8);
      reasons.push("야간 미허용");
    }

    driverCands.push({
      id: d.id,
      name: d.user?.name ?? "기사",
      detail: `${d.availableRegion || "지역 무관"} · ${d.isExternal ? "외주" : "자사"}`,
      score,
      reasons,
    });
  }

  // ---- 차량 후보 ----
  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null, status: "ACTIVE", seats: { gte: participants } },
  });
  const vehicleCands: Candidate[] = [];

  for (const v of vehicles) {
    if (await hasTimeConflict("vehicleId", v.id, start, end)) continue;
    let score = 0;
    const reasons: string[] = [];
    // 좌석 적정성: 정원 대비 낭비 최소화
    const seatGap = v.seats - participants;
    if (seatGap >= 0 && seatGap <= 5) {
      score += 15;
      reasons.push(`좌석 적정 (${v.seats}인/${participants}명)`);
    } else {
      score += 5;
      reasons.push(`${v.seats}인승`);
    }
    if (v.ownership === "OWN") {
      score += 6;
      reasons.push("자차");
    }
    vehicleCands.push({
      id: v.id,
      name: `${v.plateNumber} · ${v.seats}인승`,
      detail: `${v.vehicleType} · ${v.ownership === "OWN" ? "자차" : `외주(${v.externalCompany || "-"})`}`,
      score,
      reasons,
    });
  }

  const top = (arr: Candidate[]) =>
    arr.sort((a, b) => b.score - a.score).slice(0, 5).map((c) => ({ ...c, score: Math.max(0, c.score) }));

  return { drivers: top(driverCands), vehicles: top(vehicleCands) };
}

export async function createRecommendedDispatch(input: {
  schedule: any;
  driverId: string;
  vehicleId: string;
  guideId?: string | null;
  score: number;
  operator: { id: string; name?: string | null; role: any };
}): Promise<{ dispatch: any; warning: string | null }> {
  const { schedule, driverId, vehicleId, guideId, score, operator } = input;
  const { start, end } = computeScheduleTimes(schedule);

  const conflict = await prisma.dispatch.findFirst({
    where: {
      driverId,
      deletedAt: null,
      status: { notIn: ["CANCELLED", "FAILED"] },
      scheduledStart: { lte: end },
      scheduledEnd: { gte: start },
    },
  });
  if (conflict) {
    throw new Error("선택한 기사는 같은 시간대에 다른 배차가 이미 있습니다. 다른 후보를 선택해주세요.");
  }
  const vehicleConflict = await prisma.dispatch.findFirst({
    where: {
      vehicleId,
      deletedAt: null,
      status: { notIn: ["CANCELLED", "FAILED"] },
      scheduledStart: { lte: end },
      scheduledEnd: { gte: start },
    },
  });
  if (vehicleConflict) {
    throw new Error("선택한 차량은 같은 시간대에 다른 배차가 이미 있습니다. 다른 후보를 선택해주세요.");
  }

  const warnings: string[] = [];
  const settings = await getSettings();
  const ymd = formatYmd(start);
  const h = isHoliday(settings, ymd);
  if (h.holiday) warnings.push(`휴일 배차 안내: ${ymd}${h.name ? ` (${h.name})` : ""}은(는) 휴일입니다.`);
  const restWarn = await restHoursWarningFor(driverId, start);
  if (restWarn) warnings.push(restWarn);

  const dispatch = await prisma.dispatch.create({
    data: {
      scheduleId: schedule.id,
      vehicleId,
      driverId,
      guideId: guideId || null,
      scheduledStart: start,
      scheduledEnd: end,
      departureLocation: schedule.departureLocation || null,
      arrivalLocation: schedule.arrivalLocation || null,
      autoRecommended: true,
      recommendationScore: Math.max(0, score),
      warnings: JSON.stringify(warnings),
      status: "PENDING",
    },
  });

  return {
    dispatch,
    warning: warnings.length ? warnings.join(" / ") : null,
  };
}

export function scheduleLabel(schedule: any): string {
  const product = schedule.product?.productName ?? "상품없음";
  const client = schedule.client
    ? (schedule.client.personalName || schedule.client.officialName || "-")
    : "";
  return `${product} / ${client || "-"} / ${formatYmd(schedule.startDate)} ${schedule.startTime || "09:00"}`;
}