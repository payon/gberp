import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistrar } from "@/components/service-worker";
import { companyName, getSettings, setting } from "@/lib/settings";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const name = companyName(settings);
  const logoPath = setting(settings, "company.logoPath");
  const pwaIcon = setting(settings, "pwa.iconPath").trim();
  const appName = setting(settings, "pwa.name").trim() || `${name} ERP`;
  const shortName = setting(settings, "pwa.shortName").trim() || `${name}ERP`;

  const iconSrc = pwaIcon || logoPath || "/icons/icon-192.png";
  const icons: Metadata["icons"] = { icon: iconSrc, apple: "/icons/apple-touch-icon.png" };

  return {
    title: `${appName} 시스템`,
    description: `${appName} 통합 업무관리 플랫폼 (배차/정산/회계/문서) — 기사·가이드 앱, PWA, 음성 안내`,
    manifest: "/manifest.webmanifest",
    applicationName: appName,
    appleWebApp: {
      capable: true,
      title: shortName,
      statusBarStyle: "black-translucent",
    },
    icons,
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSettings();
  const themeColor = setting(settings, "pwa.themeColor").trim() || "#0a0a0a";
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
    themeColor,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegistrar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}