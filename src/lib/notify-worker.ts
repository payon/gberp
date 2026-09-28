import { prisma } from "./prisma";
import { getSettings, setting } from "./settings";
import { pushToUserIds } from "./push";
import { sendEmailEntry } from "./email";
import { SECURITY_POLICY } from "./security-policy";

const MAX_RETRY = SECURITY_POLICY.notify.maxRetry;
const BATCH = SECURITY_POLICY.notify.batchSize;

async function attemptSms(entry: any): Promise<{ ok: boolean; error?: string }> {
  const s = await getSettings();
  return attemptSmsWith(entry, setting(s, "sms.gatewayUrl"), setting(s, "sms.apiKey"));
}

async function attemptSmsWith(entry: any, gatewayUrl: string, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  if (!entry.targetPhone) return { ok: false, error: "수신 번호 없음" };
  if (!gatewayUrl) return { ok: false, error: "SMS 게이트웨이 미설정" };
  try {
    const url = gatewayUrl
      .replace("{phone}", encodeURIComponent(entry.targetPhone))
      .replace("{message}", encodeURIComponent(`${entry.title} ${entry.message}`.trim()))
      .replace("{apiKey}", encodeURIComponent(apiKey));
    await fetch(url, { signal: AbortSignal.timeout(SECURITY_POLICY.notify.fetchTimeoutMs) }).catch(() => null);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "전송 실패" };
  }
}

export async function runNotificationRetry(limit = BATCH): Promise<{ processed: number; sent: number; failed: number }> {
  const now = new Date();
  const due = await prisma.notificationQueue.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      retryCount: { lt: MAX_RETRY },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: Math.min(limit, BATCH),
  });
  let sent = 0;
  let failed = 0;
  for (const e of due) {
    let r: { ok: boolean; error?: string };
    if (e.channel === "SMS") {
      r = await attemptSms(e);
    } else if (e.channel === "EMAIL") {
      r = await sendEmailEntry(e);
    } else if (e.channel === "PUSH") {
      try {
        const res = await pushToUserIds([e.targetId], { title: e.title, body: e.message });
        r = res.ok > 0 ? { ok: true } : { ok: false, error: "구독 없음 또는 발송 실패" };
      } catch (err: any) {
        r = { ok: false, error: err?.message ?? "푸시 실패" };
      }
    } else {
      r = { ok: true };
    }
    if (r.ok) {
      sent++;
      await prisma.notificationQueue.update({
        where: { id: e.id },
        data: { status: "SENT", sentAt: new Date(), errorMessage: null, retryCount: e.retryCount + 1 },
      });
    } else {
      failed++;
      await prisma.notificationQueue.update({
        where: { id: e.id },
        data: { status: "FAILED", errorMessage: (r.error ?? "실패").slice(0, SECURITY_POLICY.audit.errorChars), retryCount: e.retryCount + 1 },
      });
    }
  }
  return { processed: due.length, sent, failed };
}

export async function enqueueInApp(input: {
  targetType: string;
  targetId: string;
  title: string;
  message: string;
  data?: string | null;
}): Promise<string | null> {
  try {
    const row = await prisma.notificationQueue.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        channel: "IN_APP",
        title: input.title,
        message: input.message,
        data: input.data ?? null,
        status: "PENDING",
      },
    });
    return row.id;
  } catch {
    return null;
  }
}
