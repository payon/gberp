import { prisma } from "./prisma";
import { getSettings } from "./settings";
import { featureEnabled } from "./features";
import { enqueueInApp } from "./notify-worker";
import { SECURITY_POLICY, isValidPhone } from "./security-policy";

export async function notifyDispatchCreated(dispatch: any) {
  const settings = await getSettings();
  if (!featureEnabled(settings, "smsNotify")) return;

  const [driver, guide] = await Promise.all([
    dispatch.driverId
      ? prisma.driver.findUnique({ where: { id: dispatch.driverId }, include: { user: true } })
      : null,
    dispatch.guideId
      ? prisma.guide.findUnique({ where: { id: dispatch.guideId }, include: { user: true } })
      : null,
  ]);

  const fmt = (d?: Date | string | null) => {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(
      dt.getMinutes()
    ).padStart(2, "0")}`;
  };

  const message = `[배차 안내] ${fmt(dispatch.scheduledStart)} 출발 배차가 배정되었습니다. 차량/노선은 앱에서 확인해주세요.`;

  const targets: { userId: string; phone: string; name: string; targetType: string }[] = [];
  if (driver?.user?.phone && isValidPhone(driver.user.phone)) {
    targets.push({ userId: driver.userId, phone: driver.user.phone.trim(), name: driver.user.name ?? "기사", targetType: "driver" });
  }
  if (guide?.user?.phone && isValidPhone(guide.user.phone)) {
    targets.push({ userId: guide.userId, phone: guide.user.phone.trim(), name: guide.user.name ?? "가이드", targetType: "guide" });
  }
  if (targets.length === 0) return;

  for (const t of targets) {
    await enqueueInApp({
      targetType: t.targetType,
      targetId: t.userId,
      title: "새 배차 안내",
      message,
      data: JSON.stringify({ dispatchId: dispatch.id }),
    });
  }

  const gatewayUrl: string = settings["sms.gatewayUrl"] ?? "";
  const apiKey: string = settings["sms.apiKey"] ?? "";

  for (const t of targets) {
    try {
      await prisma.notificationQueue.create({
        data: {
          targetType: t.targetType,
          targetId: t.userId,
          targetPhone: t.phone,
          channel: "SMS",
          title: "배차 안내",
          message,
          data: JSON.stringify({ dispatchId: dispatch.id }),
          status: "PENDING",
        },
      });
    } catch {
      // 큐 기록 실패는 치명적이지 않음
    }

    if (gatewayUrl) {
      const url = gatewayUrl
        .replace("{phone}", encodeURIComponent(t.phone))
        .replace("{message}", encodeURIComponent(message))
        .replace("{apiKey}", encodeURIComponent(apiKey));
      fetch(url, { signal: AbortSignal.timeout(SECURITY_POLICY.notify.fetchTimeoutMs) }).catch(() => {
        // 게이트웨이 전송 실패는 큐에 남으므로 무시
      });
    }
  }
}