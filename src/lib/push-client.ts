"use client";

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Clean = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Clean);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function notificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid");
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

export async function subscribeToPush(): Promise<{ ok: boolean; status?: string }> {
  if (!notificationSupported()) return { ok: false, status: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, status: permission === "denied" ? "denied" : "blocked" };

  const publicKey = await getVapidPublicKey();
  if (!publicKey) return { ok: false, status: "no-vapid" };

  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  return { ok: res.ok, status: res.ok ? "subscribed" : "save-failed" };
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!notificationSupported()) return false;
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  let ok = true;
  if (subscription) {
    const endpoint = subscription.endpoint;
    ok = await subscription.unsubscribe().catch(() => false);
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});
  } else {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {});
  }
  return ok;
}

export async function isPushActive(): Promise<boolean> {
  if (!notificationSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

export async function showNotification(title: string, body: string, url: string, tag?: string): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({
    type: "SHOW_NOTIFICATION",
    title,
    body,
    url,
    tag: tag || `local-${Date.now()}`,
  });
}