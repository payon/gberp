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

type ContractItem = { name?: string; amount?: number; qty?: number; unit?: string };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasRole(session.user.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { product: true, client: true },
  });
  if (!contract || contract.deletedAt) {
    return NextResponse.json({ error: "계약을 찾을 수 없습니다." }, { status: 404 });
  }

  const settings = await getSettings();
  const companyName = settings["company.name"] || "";
  const companyReg = settings["company.registrationNumber"] || "";

  let items: ContractItem[] = [];
  try {
    const arr = JSON.parse(contract.items || "[]");
    if (Array.isArray(arr)) {
      items = arr
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          name: String(x.name ?? ""),
          amount: Number(x.amount ?? 0),
          qty: Number(x.qty ?? 0),
          unit: String(x.unit ?? ""),
        }));
    }
  } catch {
    // ignore
  }

  const paid = (contract.depositPaid ?? 0) + (contract.balancePaid ?? 0);

  const sheet1 = XLSX.utils.aoa_to_sheet([
    [`${companyName} 견적/계약서`],
    [companyReg ? `사업자등록번호: ${companyReg}` : companyName],
    [],
    ["계약번호", textCell(contract.contractNumber)],
    ["고객", textCell(clientName(contract.client))],
    ["상품", textCell(contract.product?.productName ?? "")],
    ["계약일", textCell(formatDate(contract.contractDate))],
    ["기간", textCell(`${formatDate(contract.startDate)} ~ ${formatDate(contract.endDate)}`)],
    ["계약 총액", contract.totalAmount],
    ["계약금", contract.depositAmount ?? 0],
    ["계약금 납부", contract.depositPaid],
    ["잔금 납부", contract.balancePaid],
    ["총 납부액", paid],
    ["잔액", contract.totalAmount - paid],
    ["영업사원", textCell(contract.quotedBy ?? "")],
    ["상태", textCell(CONTRACT_STATUS_LABELS[contract.status] ?? contract.status)],
    ["비고", textCell(contract.notes ?? "")],
  ]);
  sheet1["!cols"] = [{ wch: 16 }, { wch: 40 }];

  const sheet2 =
    items.length > 0
      ? XLSX.utils.aoa_to_sheet([
          ["항목명", "수량", "단가", "금액"],
          ...items.map((it) => [
            textCell(it.name),
            it.qty || "",
            textCell(it.unit || ""),
            it.amount,
          ]),
        ])
      : XLSX.utils.aoa_to_sheet([["항목내역이 없습니다."]]);
  sheet2["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet1, "계약서");
  XLSX.utils.book_append_sheet(wb, sheet2, "항목내역");

  return xlsxDownload(wb, `contract-${contract.contractNumber}`);
}