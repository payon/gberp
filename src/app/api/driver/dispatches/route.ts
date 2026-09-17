import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  DISPATCH_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  statusVariant,
  parseStops,
  parseWarnings,
} from "@/lib/resources";
import { getSettings, formatYmd, isHoliday, setting } from "@/lib/settings";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const role = session.user.role as UserRole;
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "upcoming";

  const settings = await getSettings();
  const todayYmd = formatYmd(new Date());
  const tdHoliday = isHoliday(settings, todayYmd);
  const todayHoliday = tdHoliday.holiday ? { date: todayYmd, name: tdHoliday.name ?? "" } : null;
  const rate = Number(setting(settings, "voice.defaultRate"));
  const voice = {
    defaultRate: Number.isFinite(rate) ? Math.min(1.5, Math.max(0.5, rate)) : 0.95,
    autoAnnounce: setting(settings, "voice.autoAnnounce") !== "false",
  };

  if (role === "DRIVER") {
    const profile = await prisma.driver.findUnique({ where: { userId: session.user.id } });
    if (!profile) return NextResponse.json({ error: "기사 프로필이 없습니다." }, { status: 404 });
    const dispatches = await prisma.dispatch.findMany({
      where: {
        driverId: profile.id,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "FAILED"] },
        ...(range === "today"
          ? {
              scheduledStart: { gte: dayStart(), lte: dayEnd() },
            }
          : {
              scheduledEnd: { gte: new Date() },
            }),
      },
      include: {
        schedule: { include: { product: true, client: true } },
        vehicle: true,
        guide: { include: { user: true } },
      },
      orderBy: { scheduledStart: "asc" },
    });
    return NextResponse.json({ data: dispatches.map((d) => serialize(d)), todayHoliday, voice });
  }

  if (role === "GUIDE") {
    const profile = await prisma.guide.findUnique({ where: { userId: session.user.id } });
    if (!profile) return NextResponse.json({ error: "가이드 프로필이 없습니다." }, { status: 404 });
    const dispatches = await prisma.dispatch.findMany({
      where: {
        guideId: profile.id,
        deletedAt: null,
        status: { notIn: ["CANCELLED", "FAILED"] },
        ...(range === "today"
          ? {
              scheduledStart: { gte: dayStart(), lte: dayEnd() },
            }
          : {
              scheduledEnd: { gte: new Date() },
            }),
      },
      include: {
        schedule: { include: { product: true, client: true } },
        vehicle: true,
        driver: { include: { user: true } },
      },
      orderBy: { scheduledStart: "asc" },
    });
    return NextResponse.json({ data: dispatches.map((d) => serialize(d, true)), todayHoliday, voice });
  }

  return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
}

function dayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayEnd() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function serialize(d: any, forGuide = false) {
  const st = d.scheduledStart ? new Date(d.scheduledStart) : null;
  const et = d.scheduledEnd ? new Date(d.scheduledEnd) : null;
  const client = d.schedule?.client;
  const clientName = client
    ? client.personalName || client.officialName || client.documentName || "고객"
    : "";
  return {
    id: d.id,
    scheduleId: d.scheduleId,
    productName: d.schedule?.product?.productName ?? "",
    clientName,
    participants: d.schedule?.participants ?? 0,
    startYmd: st ? `${st.getFullYear()}-${st.getMonth() + 1}-${st.getDate()}` : "",
    startDate: st ? `${st.getMonth() + 1}월 ${st.getDate()}일` : "",
    startTime: st
      ? `${st.getHours() < 12 ? "오전" : "오후"} ${st.getHours() % 12 === 0 ? 12 : st.getHours() % 12}시 ${st.getMinutes() ? st.getMinutes() + "분" : ""}`
      : "",
    endTime: et
      ? `${et.getHours() < 12 ? "오전" : "오후"} ${et.getHours() % 12 === 0 ? 12 : et.getHours() % 12}시 ${et.getMinutes() ? et.getMinutes() + "분" : ""}`
      : "",
    scheduledStart: d.scheduledStart,
    scheduledEnd: d.scheduledEnd,
    actualStart: d.actualStart,
    actualEnd: d.actualEnd,
    departureLocation: d.departureLocation ?? d.schedule?.departureLocation ?? "",
    arrivalLocation: d.arrivalLocation ?? d.schedule?.arrivalLocation ?? "",
    stops: parseStops(d.route),
    stopsText: parseStops(d.route).map(
      (s, i) => `${i + 1}. ${s.stopName}${s.stopTime ? ` (${s.stopTime})` : ""}`
    ),
    warningsList: parseWarnings(d.warnings),
    plateNumber: d.vehicle?.plateNumber ?? "",
    vehicleType: d.vehicle ? VEHICLE_TYPE_LABELS[d.vehicle.vehicleType] ?? d.vehicle.vehicleType : "",
    driverName: forGuide ? d.driver?.user?.name ?? "-" : "",
    guideName: forGuide ? "" : d.guide?.user?.name ?? "-",
    status: d.status,
    statusLabel: DISPATCH_STATUS_LABELS[d.status] ?? d.status,
    statusVariant: statusVariant(d.status),
    specialConditions: d.specialConditions ?? "",
    notes: d.notes ?? "",
  };
}