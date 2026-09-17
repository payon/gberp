"use client";

import { useCallback, useEffect, useState } from "react";
import {
  notificationSupported,
  subscribeToPush,
  unsubscribeFromPush,
  isPushActive,
} from "@/lib/push-client";

export type PushState =
  | "checking"
  | "unsupported"
  | "idle"
  | "subscribed"
  | "denied"
  | "error";

export function usePush() {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!notificationSupported()) {
      setState("unsupported");
      return;
    }
    setState("idle");
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    const active = await isPushActive();
    setState(active ? "subscribed" : "idle");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const res = await subscribeToPush();
      setState(res.ok ? "subscribed" : res.status === "denied" ? "denied" : "error");
      return res.ok;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setState("idle");
      return true;
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable, refresh };
}