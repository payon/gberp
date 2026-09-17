import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { todayStart, todayEnd, monthStart } from "@/lib/utils";

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR, UserRole.SALES];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const role = session.user.role as UserRole;
  if (!hasRole(role, STAFF_ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const [
    totalClients,
    totalProducts,
    totalVehicles,
    totalDrivers,
    todayDispatches,
    pendingDispatches,
    inProgressDispatches,
    monthRevenue,
    pendingContracts,
    activeContracts,
    pendingSettlements,
    dispatchRules,
    recentDispatches,
    recentContracts,
    clientTypeAgg,
  ] = await Promise.all([
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.travelProduct.count({ where: { deletedAt: null } }),
    prisma.vehicle.count({ where: { deletedAt: null } }),
    prisma.driver.count({ where: { deletedAt: null } }),
    prisma.dispatch.count({
      where: { deletedAt: null, scheduledStart: { gte: todayStart(), lte: todayEnd() } },
    }),
    prisma.dispatch.count({
      where: { deletedAt: null, status: "PENDING" },
    }),
    prisma.dispatch.count({
      where: { deletedAt: null, status: "IN_PROGRESS" },
    }),
    prisma.accountingEntry.aggregate({
      where: {
        deletedAt: null,
        entryDate: { gte: monthStart() },
        entryType: "SALES",
      },
      _sum: { debit: true },
    }),
    prisma.contract.count({ where: { deletedAt: null, status: "PENDING" } }),
    prisma.contract.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.settlement.count({ where: { deletedAt: null, status: "PENDING" } }),
    prisma.dispatchRule.count({ where: { isActive: true } }),
    prisma.dispatch.findMany({
      where: { deletedAt: null },
      include: { driver: { include: { user: true } }, vehicle: true, schedule: { include: { product: true } } },
      orderBy: { scheduledStart: "desc" },
      take: 8,
    }),
    prisma.contract.findMany({
      where: { deletedAt: null },
      include: { client: true },
      orderBy: { contractDate: "desc" },
      take: 8,
    }),
    prisma.client.groupBy({
      by: ["clientType"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const isOperator = role === "OPERATOR" || role === "SALES";

  return NextResponse.json({
    role,
    cards: isAdmin
      ? [
          { key: "todayDispatch", label: "오늘 배차", value: todayDispatches },
          { key: "monthRevenue", label: "이달 매출", value: monthRevenue._sum.debit ?? 0, money: true },
          { key: "activeContracts", label: "진행중 계약", value: activeContracts },
          { key: "pendingSettlement", label: "정산 대기", value: pendingSettlements },
        ]
      : isOperator
        ? [
            { key: "todayDispatch", label: "오늘 배차", value: todayDispatches },
            { key: "pendingDispatch", label: "미확정 배차", value: pendingDispatches },
            { key: "inProgress", label: "운행중", value: inProgressDispatches },
            { key: "pendingContracts", label: "계약 대기", value: pendingContracts },
          ]
        : [
            { key: "todayDispatch", label: "오늘 운행", value: todayDispatches },
            { key: "inProgress", label: "운행중", value: inProgressDispatches },
          ],
    counts: {
      totalClients,
      totalProducts,
      totalVehicles,
      totalDrivers,
      pendingSettlements,
      dispatchRules,
    },
    recentDispatches: recentDispatches.map((d: any) => ({
      id: d.id,
      date: d.scheduledStart,
      driver: d.driver?.user?.name ?? "-",
      plate: d.vehicle?.plateNumber ?? "-",
      product: d.schedule?.product?.productName ?? "-",
      status: d.status,
    })),
    recentContracts: recentContracts.map((c: any) => ({
      id: c.id,
      number: c.contractNumber,
      client: c.client ? (c.client.personalName || c.client.officialName || "-") : "-",
      amount: c.totalAmount,
      status: c.status,
      date: c.contractDate,
    })),
    clientTypes: clientTypeAgg.map((c: any) => ({
      type: c.clientType,
      count: c._count._all,
    })),
  });
}