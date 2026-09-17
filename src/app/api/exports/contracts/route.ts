import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { getSettings } from "@/lib/settings";
import { clientName, CONTRACT_STATUS_LABELS } from "@/lib/resources";
import { formatDate } from "@/lib/utils";
import { textCell, xlsxDownload } from "@/lib/xlsx";
import * as XLSX from "xlsx";

const ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES, UserRole.OPERATOR];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasRole(session.user.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const [contracts, settings] = await Promise.all([
    prisma.contract.findMany({
      where: { deletedAt: null },
      include: { product: true, client: true },
      orderBy: { contractDate: "desc" },
    }),
    getSettings(),
  ]);

  const companyName = settings["company.name"] || "";
  const companyReg = settings["company.registrationNumber"] || "";

  const headers = [
    "계약번호",
    "고객",
    "상품",
    "계약일",
    "시작일",
    "종료일",
    "총액",
    "계약금",
    "계약금 납부",
    "잔금 납부",
    "총 납부액",
    "잔액",
    "영업사원",
    "항목내역",
    "상태",
    "비고",
    "생성일",
  ];

  const rows = contracts.map((c) => {
    const paid = (c.depositPaid ?? 0) + (c.balancePaid ?? 0);
    return [
      textCell(c.contractNumber),
      textCell(clientName(c.client)),
      textCell(c.product?.productName ?? ""),
      textCell(formatDate(c.contractDate)),
      textCell(formatDate(c.startDate)),
      textCell(formatDate(c.endDate)),
      c.totalAmount,
      c.depositAmount ?? 0,
      c.depositPaid,
      c.balancePaid,
      paid,
      c.totalAmount - paid,
      textCell(c.quotedBy ?? ""),
      textCell(c.items ?? ""),
      textCell(CONTRACT_STATUS_LABELS[c.status] ?? c.status),
      textCell(c.notes ?? ""),
      textCell(formatDate(c.createdAt)),
    ];
  });

  const sheet = XLSX.utils.aoa_to_sheet([
    [companyName, ""],
    [companyReg ? `사업자등록번호: ${companyReg}` : ""],
    [],
    headers,
    ...rows,
  ]);
  sheet["!cols"] = [
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 },
    { wch: 10 },
    { wch: 24 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "계약 목록");

  return xlsxDownload(wb, "contracts");
}