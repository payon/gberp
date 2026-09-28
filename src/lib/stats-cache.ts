import { prisma } from "./prisma";

export async function getCachedStats(key: string): Promise<any | null> {
  try {
    const row = await prisma.statsCache.findUnique({ where: { cacheKey: key } });
    if (!row || row.validUntil.getTime() <= Date.now()) return null;
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

export async function setCachedStats(key: string, cacheType: string, data: any, ttlMinutes: number): Promise<void> {
  const dataStr = JSON.stringify(data);
  const dataCount = Array.isArray((data as any)?.recentDispatches) ? (data as any).recentDispatches.length : 0;
  try {
    await prisma.statsCache.upsert({
      where: { cacheKey: key },
      update: { data: dataStr, dataCount, validUntil: new Date(Date.now() + ttlMinutes * 60_000) },
      create: { cacheKey: key, cacheType, data: dataStr, dataCount, validUntil: new Date(Date.now() + ttlMinutes * 60_000) },
    });
  } catch {
    // ignore
  }
}

export async function invalidateStatsCache(prefix = "stats:"): Promise<number> {
  try {
    const rows = await prisma.statsCache.findMany({ select: { cacheKey: true } });
    const keys = rows.map((r) => r.cacheKey).filter((k) => k.startsWith(prefix));
    if (keys.length === 0) return 0;
    await prisma.statsCache.deleteMany({ where: { cacheKey: { in: keys } } });
    return keys.length;
  } catch {
    return 0;
  }
}
