import { prisma } from "./prisma";
import { formatDate } from "./utils";
import { SECURITY_POLICY } from "./security-policy";

export type DouzoneTargetType = "entry" | "slip";

export type DouzoneRow = {
  slipDate: string;
  slipNumber: string;
  accountCode: string;
  subAccountCode: string;
  debit: number;
  credit: number;
  description: string;
  reference: string;
};

export function toCsv(rows: DouzoneRow[]): string {
  const head = "전표일자,전표번호,계정코드,보조계정코드,차변,대변,적요,참조번호";
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [head, ...rows.map((r) => [r.slipDate, r.slipNumber, r.accountCode, r.subAccountCode, r.debit, r.credit, r.description, r.reference].map(esc).join(","))].join("\n");
}

export async function mapTargets(targetType: DouzoneTargetType, ids: string[]): Promise<{ rows: DouzoneRow[]; targets: { id: string; label: string }[] }> {
  const rows: DouzoneRow[] = [];
  const targets: { id: string; label: string }[] = [];
  if (targetType === "entry") {
    const entries = await prisma.accountingEntry.findMany({ where: { id: { in: ids } } });
    for (const e of entries) {
      rows.push({
        slipDate: formatDate(e.entryDate),
        slipNumber: e.entryNumber,
        accountCode: e.accountCode ?? "",
        subAccountCode: e.subAccountCode ?? "",
        debit: Number(e.debit ?? 0),
        credit: Number(e.credit ?? 0),
        description: e.description ?? "",
        reference: e.referenceNumber ?? "",
      });
      targets.push({ id: e.id, label: e.entryNumber });
    }
  } else {
    const slips = await prisma.accountingSlip.findMany({ where: { id: { in: ids } } });
    for (const s of slips) {
      rows.push({
        slipDate: formatDate(s.slipDate),
        slipNumber: s.slipNumber,
        accountCode: "",
        subAccountCode: "",
        debit: Number(s.totalDebit ?? 0),
        credit: Number(s.totalCredit ?? 0),
        description: s.description ?? "",
        reference: s.slipNumber,
      });
      targets.push({ id: s.id, label: s.slipNumber });
    }
  }
  return { rows, targets };
}

export async function pushToGateway(endpointUrl: string, apiKey: string, payload: { csv: string; rows: DouzoneRow[] }): Promise<{ ok: boolean; response: string }> {
  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
    body: JSON.stringify({ apiKey: apiKey || undefined, ...payload }),
    signal: AbortSignal.timeout(SECURITY_POLICY.douzone.fetchTimeoutMs),
  });
  const text = await res.text().catch(() => "");
  return { ok: res.ok, response: text.slice(0, SECURITY_POLICY.douzone.responseMaxChars) };
}
