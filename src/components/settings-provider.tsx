"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Settings = Record<string, string>;

const SettingsContext = createContext<{
  settings: Settings;
  refresh: () => Promise<void>;
}>({ settings: {}, refresh: async () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/public", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.settings && typeof data.settings === "object") {
          setSettings(data.settings);
        }
      }
    } catch {
      // 오프라인 등은 기본값 사용
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/settings/public", { cache: "no-store" });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          if (data?.settings && typeof data.settings === "object") {
            setSettings(data.settings);
          }
        }
      } catch {
        // 오프라인 등은 기본값 사용
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return <SettingsContext.Provider value={{ settings, refresh }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function companyName(settings: Settings): string {
  return settings["company.name"] || "종합여행사";
}

export function companyLogoPath(settings: Settings): string {
  return settings["company.logoPath"] || "";
}