import { prisma } from "./prisma";
import { getSettings, setting } from "./settings";
import { SECURITY_POLICY } from "./security-policy";

export async function enqueueEmail(input: {
  targetType: string;
  targetId: string;
  targetEmail?: string | null;
  title: string;
  message: string;
  data?: string | null;
  scheduledAt?: Date | null;
}): Promise<string | null> {
  try {
    const row = await prisma.notificationQueue.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        targetEmail: input.targetEmail ?? null,
        channel: "EMAIL",
        title: input.title,
        message: input.message,
        data: input.data ?? null,
        scheduledAt: input.scheduledAt ?? null,
        status: "PENDING",
      },
    });
    return row.id;
  } catch {
    return null;
  }
}

export async function sendEmailEntry(entry: {
  id: string;
  targetEmail: string | null;
  title: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!entry.targetEmail) return { ok: false, error: "수신 이메일 없음" };
  const s = await getSettings();
  const gatewayUrl = setting(s, "email.gatewayUrl").trim();
  const apiKey = setting(s, "email.apiKey");
  const from = setting(s, "email.from").trim();
  if (!gatewayUrl) return { ok: false, error: "이메일 게이트웨이 미설정" };
  try {
    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
      body: JSON.stringify({
        to: entry.targetEmail,
        from: from || undefined,
        subject: entry.title,
        text: entry.message,
      }),
      signal: AbortSignal.timeout(SECURITY_POLICY.notify.fetchTimeoutMs),
    });
    if (!res.ok) return { ok: false, error: `게이트웨이 오류 (${res.status})` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "전송 실패" };
  }
}
