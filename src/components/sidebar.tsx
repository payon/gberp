"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type MenuItem } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Package,
  CalendarClock,
  FileText,
  BusFront,
  Car,
  IdCard,
  MapPinned,
  Calculator,
  Wallet,
  BarChart3,
  ShieldCheck,
  Bell,
  Settings,
  LogOut,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { useSettings, companyName, companyLogoPath } from "@/components/settings-provider";

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/clients": Users,
  "/dashboard/products": Package,
  "/dashboard/schedules": CalendarClock,
  "/dashboard/contracts": FileText,
  "/dashboard/dispatches": BusFront,
  "/dashboard/vehicles": Car,
  "/dashboard/drivers": IdCard,
  "/dashboard/guides": MapPinned,
  "/dashboard/accounting": Calculator,
  "/dashboard/settlements": Wallet,
  "/dashboard/reports": BarChart3,
  "/dashboard/notifications": Bell,
  "/dashboard/settings": Settings,
  "/dashboard/users": ShieldCheck,
};

export function Sidebar({
  items,
  user,
}: {
  items: MenuItem[];
  user: { name?: string | null; email?: string | null; role?: string };
}) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const cName = companyName(settings);
  const cLogo = companyLogoPath(settings);
  const cBiz = settings["company.businessType"] || "Travel Agency";

  const groups: { label: string; items: MenuItem[] }[] = [];
  for (const item of items) {
    const group = groups.find((g) => g.label === item.group);
    if (group) group.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        {cLogo ? (
          <img src={cLogo} alt={cName} className="h-9 w-9 rounded-lg object-contain" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-bold leading-tight">{cName}</div>
          <div className="text-xs text-muted-foreground">{cBiz}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = ICONS[item.href] ?? LayoutDashboard;
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
          <UserCircle className="h-8 w-8 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name ?? "사용자"}</div>
            <div className="truncate text-xs text-muted-foreground">
              {user.role ? ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role : ""}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full justify-start gap-2"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </aside>
  );
}