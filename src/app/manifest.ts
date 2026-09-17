import type { MetadataRoute } from "next";
import { getSettings, setting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const name = settings["company.name"] || "종합여행사";
  const logoPath = setting(settings, "company.logoPath");

  return {
    name: `${name} ERP`,
    short_name: `${name}ERP`.slice(0, 12),
    description: "배차/일정/정산/알림을 하나로 — 기사님 앱(음성 안내 포함)",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    lang: "ko",
    categories: ["business", "travel", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ...(logoPath
        ? [{ src: logoPath, sizes: "512x512", type: "image/png" as const }]
        : []),
    ],
  };
}