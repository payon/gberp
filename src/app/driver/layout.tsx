import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MobileNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { DriverLogoutButton } from "@/components/driver-logout-button";
import type { UserRole } from "@prisma/client";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  const role = session.user.role as UserRole;
  if (role !== "DRIVER" && role !== "GUIDE") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl bg-background pb-[calc(64px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BusIcon />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">여행사 ERP</div>
            <div className="text-[11px] text-muted-foreground">
              {role === "GUIDE" ? "가이드" : "기사"}님 앱
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="max-w-[10rem] truncate text-xs text-muted-foreground">{session.user.name}</span>
          <DriverLogoutButton />
        </div>
      </header>
      <main className="p-4">{children}</main>
      <MobileNav role={role} />
      <InstallPrompt />
    </div>
  );
}

function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M6 3h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        fill="currentColor"
      />
      <rect x="4" y="9" width="16" height="5" fill="white" opacity="0.85" />
      <circle cx="8.5" cy="17" r="1.5" fill="white" />
      <circle cx="15.5" cy="17" r="1.5" fill="white" />
    </svg>
  );
}