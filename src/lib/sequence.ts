import { prisma } from "./prisma";

// 일자별 순번 생성의 동시성 충돌(P2002)을 재시도로 흡수한다.
// count+1 방식을 유지하되, unique 충돌 시 재조회 후 재시도한다.
export async function nextDailyNumber(opts: {
  model: "settlement" | "accountingEntry" | "contract";
  prefix: string;
  field: "settlementNumber" | "entryNumber" | "contractNumber";
  maxRetries?: number;
}): Promise<string> {
  const { model, prefix, field, maxRetries = 5 } = opts;
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const head = `${prefix}-${ymd}`;
  const delegate = (prisma as any)[model];
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const count: number = await delegate.count({ where: { [field]: { startsWith: head } } });
    const candidate = `${head}-${String(count + 1 + attempt).padStart(3, "0")}`;
    const exists = await delegate.findFirst({ where: { [field]: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${head}-${Date.now().toString().slice(-6)}-${rand}`;
}
