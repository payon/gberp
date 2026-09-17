import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getSettings, setting } from "@/lib/settings";
import { clientName, CLIENT_TYPE_LABELS, CONTRACT_STATUS_LABELS } from "@/lib/resources";
import { formatDate, formatWon } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";
import { hasRole } from "@/lib/permissions";

const STAFF_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES, UserRole.OPERATOR];

type ContractItem = { name?: string; amount?: number; qty?: number; unit?: string };

function parseItems(raw: string | null | undefined): ContractItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr
        .filter((x) => x && typeof x === "object")
        .map((x: any) => ({
          name: String(x.name ?? x.itemName ?? ""),
          amount: Number(x.amount ?? 0),
          qty: Number(x.qty ?? 0),
          unit: String(x.unit ?? ""),
        }));
    }
  } catch {
    // ignore
  }
  return [];
}

export default async function ContractPrintPage(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (!hasRole(session.user.role as UserRole, STAFF_ROLES)) redirect("/dashboard");

  const [contract, settings] = await Promise.all([
    prisma.contract.findUnique({
      where: { id },
      include: { product: true, client: true },
    }),
    getSettings(),
  ]);

  if (!contract || contract.deletedAt) redirect("/dashboard/contracts");

  const c = contract;
  const company = {
    name: setting(settings, "company.name"),
    logoPath: setting(settings, "company.logoPath"),
    reg: setting(settings, "company.registrationNumber"),
    ceo: setting(settings, "company.ceoName"),
    phone: setting(settings, "company.phone"),
    email: setting(settings, "company.email"),
    address: setting(settings, "company.address"),
  };

  const items = parseItems(c.items);
  const client = c.client;
  const paid = (c.depositPaid ?? 0) + (c.balancePaid ?? 0);
  const balance = c.totalAmount - paid;
  const itemSum = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

  const row = (label: string, value: string, bold = false) => (
    <tr className="border-b border-gray-200">
      <td className="w-36 bg-gray-50 px-3 py-2 align-top text-sm font-semibold text-gray-700">{label}</td>
      <td className={`px-3 py-2 align-top text-sm ${bold ? "font-bold text-gray-900" : "text-gray-800"}`}>{value}</td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      <div className="print:hidden mx-auto mb-4 flex max-w-[820px] items-center justify-between rounded-xl bg-white p-4 shadow">
        <div className="text-sm text-muted-foreground">
          인쇄용 계약서 · {company.name || "회사명 설정 필요"}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/dashboard/contracts`}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            목록으로
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="mx-auto max-w-[820px] bg-white p-8 text-gray-900 shadow print:max-w-none print:shadow-none">
        {/* 헤더 */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4">
          <div className="flex items-center gap-3">
            {company.logoPath ? (
              <img src={company.logoPath} alt={company.name} className="h-14 w-14 object-contain" />
            ) : null}
            <div>
              <h1 className="text-xl font-extrabold">{company.name || "여행사"}</h1>
              <p className="text-xs text-gray-500">
                {company.address}
                {company.phone && ` · ☎ ${company.phone}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="border-2 border-gray-900 px-4 py-1 text-lg font-extrabold tracking-widest">계 약 서</div>
            <div className="mt-1 text-sm text-gray-600">제 {c.contractNumber} 호</div>
          </div>
        </div>

        {/* 기본 정보 */}
        <table className="mt-6 w-full border-t border-gray-200 text-sm">
          <tbody>
            {row("계약번호", c.contractNumber, true)}
            {row("고객", clientName(client), true)}
            {row(
              "고객 유형",
              client ? CLIENT_TYPE_LABELS[client.clientType] ?? client.clientType : "-"
            )}
            {row(
              "고객 연락처",
              client?.contactName ? `${client.contactName}${client.contactPhone ? ` (${client.contactPhone})` : ""}` : client?.contactPhone ?? "-"
            )}
            {row("고객 주소", client?.address ?? "-")}
            {row("상품", c.product?.productName ?? "-")}
            {row("계약일", formatDate(c.contractDate))}
            {row("여행 기간", `${formatDate(c.startDate)} ~ ${formatDate(c.endDate)}`)}
            {row("영업사원", c.quotedBy ?? "-")}
            {row("상태", CONTRACT_STATUS_LABELS[c.status] ?? c.status)}
          </tbody>
        </table>

        {/* 금액 표 */}
        <h2 className="mt-7 border-b border-gray-300 pb-1 text-base font-extrabold">금액 사항</h2>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">항목</th>
              <th className="border border-gray-300 px-3 py-2 text-right font-semibold">금액 (원)</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-semibold">비고</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-3 py-2">계약 총액</td>
              <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{formatWon(c.totalAmount)}</td>
              <td className="border border-gray-300 px-3 py-2" />
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2">계약금</td>
              <td className="border border-gray-300 px-3 py-2 text-right">{formatWon(c.depositAmount ?? 0)}</td>
              <td className="border border-gray-300 px-3 py-2 text-gray-500">납부: {formatWon(c.depositPaid)}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-3 py-2">잔금</td>
              <td className="border border-gray-300 px-3 py-2 text-right">{formatWon(Math.max(c.totalAmount - (c.depositAmount ?? 0), 0))}</td>
              <td className="border border-gray-300 px-3 py-2 text-gray-500">납부: {formatWon(c.balancePaid)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-3 py-2 font-bold">총 납부액</td>
              <td className="border border-gray-300 px-3 py-2 text-right font-bold">{formatWon(paid)}</td>
              <td className="border border-gray-300 px-3 py-2 text-gray-500">잔액: {formatWon(balance)}</td>
            </tr>
          </tbody>
        </table>

        {/* 항목 내역 */}
        {items.length > 0 && (
          <>
            <h2 className="mt-7 border-b border-gray-300 pb-1 text-base font-extrabold">견적 항목 내역</h2>
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">항목명</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-semibold">수량</th>
                  <th className="border border-gray-300 px-3 py-2 text-right font-semibold">금액 (원)</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter((it) => it.name || it.amount)
                  .map((it, i) => (
                    <tr key={i}>
                      <td className="border border-gray-300 px-3 py-2">{it.name || "-"}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        {it.qty ? `${it.qty}${it.unit ?? ""}` : "-"}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right">{formatWon(Number(it.amount) || 0)}</td>
                    </tr>
                  ))}
                {itemSum > 0 && (
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 font-bold" colSpan={2}>
                      항목 합계
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-bold">{formatWon(itemSum)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {c.notes && (
          <>
            <h2 className="mt-7 border-b border-gray-300 pb-1 text-base font-extrabold">특약 및 비고</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{c.notes}</p>
          </>
        )}

        {/* 서명란 */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          <div>
            <div className="border border-gray-300 p-4">
              <div className="text-sm font-bold">갑 (의뢰인)</div>
              <div className="mt-1 text-sm text-gray-700">{clientName(client)}</div>
              <div className="mt-8 text-right text-sm text-gray-500">(인)</div>
            </div>
          </div>
          <div>
            <div className="border border-gray-300 p-4">
              <div className="text-sm font-bold">을 ({company.name || "여행사"})</div>
              <div className="mt-1 text-sm text-gray-700">
                대표이사 {company.ceo || "-"}
              </div>
              <div className="mt-8 text-right text-sm text-gray-500">(인)</div>
            </div>
          </div>
        </div>

        {/* 하단 */}
        <div className="mt-10 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          {company.name}
          {company.reg && ` · 사업자등록번호 ${company.reg}`}
          {company.ceo && ` · 대표 ${company.ceo}`}
          {company.address && ` · ${company.address}`}
          {company.phone && ` · ☎ ${company.phone}`}
          {company.email && ` · ${company.email}`}
          <div className="mt-1">
            발급일: {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>
    </div>
  );
}