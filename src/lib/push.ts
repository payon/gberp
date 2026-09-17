import webpush from "web-push";
import { prisma } from "./prisma";

let initialized = false;

export function vapidConfig() {
  const subject =
    process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  return {
    subject,
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
  };
}

function ensureInit() {
  if (initialized) return;
  const cfg = vapidConfig();
  if (cfg.publicKey && cfg.privateKey) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    initialized = true;
  }
}

export function pushReady(): boolean {
  const cfg = vapidConfig();
  return Boolean(cfg.publicKey && cfg.privateKey);
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

export async function pushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  ensureInit();
  if (!pushReady()) return { ok: false, error: "VAPID 키가 설정되지 않았습니다." };
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 86400 }
    );
    return { ok: true, statusCode: 201 };
  } catch (e: any) {
    const code = e?.statusCode ?? 0;
    return { ok: false, statusCode: code, error: e?.message ?? "전송 실패" };
  }
}

export async function pushToUserIds(
  userIds: string[],
  payload: PushPayload
): Promise<{ ok: number; failed: number; removed: number; errors: string[] }> {
  if (userIds.length === 0) return { ok: 0, failed: 0, removed: 0, errors: [] };
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  let ok = 0;
  let failed = 0;
  let removed = 0;
  const errors: string[] = [];
  for (const sub of subs) {
    const res = await pushToSubscription(sub, payload);
    if (res.ok) {
      ok++;
    } else {
      failed++;
      errors.push(res.error ?? "unknown");
      if (res.statusCode === 404 || res.statusCode === 410) {
        await prisma.pushSubscription
          .deleteMany({ where: { endpoint: sub.endpoint } })
          .catch(() => {});
        removed++;
      }
    }
  }
  return { ok, failed, removed, errors };
}

export async function pushToRole(
  role: string,
  payload: PushPayload
): Promise<{ ok: number; failed: number; removed: number; errors: string[] }> {
  const users = await prisma.user.findMany({
    where: { role: role as any, deletedAt: null, status: "ACTIVE" },
    select: { id: true },
  });
  return pushToUserIds(users.map((u) => u.id), payload);
}