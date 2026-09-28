import type { MetadataRoute } from "next";
import { getSettings, setting } from "@/lib/settings";
import { APP_ICON_SIZES, APP_ICON_FILES } from "@/lib/app-icon-meta";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const company = setting(settings, "company.name") || "종합여행사";
  const name = setting(settings, "pwa.name").trim() || `${company} ERP`;
  const shortName = setting(settings, "pwa.shortName").trim() || `${company}ERP`.slice(0, 12);
  const themeColor = setting(settings, "pwa.themeColor").trim() || "#0a0a0a";
  const backgroundColor = setting(settings, "pwa.backgroundColor").trim() || "#ffffff";
  const logoPath = setting(settings, "company.logoPath");

  return {
    name,
    short_name: shortName,
    description: "배차/일정/정산/알림을 하나로 — 기사·가이드 앱(음성 안내 포함)",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: backgroundColor,
    theme_color: themeColor,
    lang: "ko",
    categories: ["business", "travel", "productivity"],
    icons: [
      ...APP_ICON_SIZES.map((s) => ({
        src: `/icons/${APP_ICON_FILES.sized(s)}`,
        sizes: `${s}x${s}` as const,
        type: "image/png" as const,
      })),
      {
        src: `/icons/${APP_ICON_FILES.maskable}`,
        sizes: "512x512" as const,
        type: "image/png" as const,
        purpose: "maskable" as const,
      },
      ...(logoPath ? [{ src: logoPath, sizes: "512x512" as const, type: "image/png" as const }] : []),
    ],
  };
}
