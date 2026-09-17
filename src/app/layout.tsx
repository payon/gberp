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

  const icons: Metadata["icons"] = logoPath
    ? { icon: logoPath, apple: "/icons/apple-touch-icon.png" }
    : { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" };

  return {
    title: `${name} ERP 시스템`,
    description: `${name} 통합 업무관리 플랫폼 (배차/정산/회계/문서) — 기사님 앱, PWA, 음성 안내`,
    manifest: "/manifest.webmanifest",
    applicationName: `${name} ERP`,
    appleWebApp: {
      capable: true,
      title: `${name}ERP`,
      statusBarStyle: "black-translucent",
    },
    icons,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

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