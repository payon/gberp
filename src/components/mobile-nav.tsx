"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Home,
  BusFront,
  Bell,
  Settings,
  Settings2,
  LogOut,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href?: string;
  label: string;
  icon: LucideIcon;
  action?: "logout";
};

function itemsForRole(role?: string): NavItem[] {
  if (role === "DRIVER" || role === "GUIDE") {
    return [
      { href: "/driver", label: "운행", icon: BusFront },
      { href: "/driver/settings", label: "안내", icon: Settings2 },
      { href: "/driver/notifications", label: "알림", icon: Bell },
      { action: "logout", label: "로그아웃", icon: LogOut },
    ];
  }
  return [
    { href: "/dashboard", label: "홈", icon: Home },
    { href: "/dashboard/dispatches", label: "배차", icon: BusFront },
    { href: "/dashboard/notifications", label: "알림", icon: Bell },
    { href: "/dashboard/settings", label: "설정", icon: Settings },
    { action: "logout", label: "로그아웃", icon: LogOut },
  ];
}

export function MobileNav({ role }: { role?: string }) {
  const pathname = usePathname();
  const items = itemsForRole(role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ height: "calc(64px + env(safe-area-inset-bottom))" }}
      aria-label="하단 메뉴"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = !!(item.href && pathname.startsWith(item.href));
        if (item.action === "logout") {
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground"
            >
              <Icon className="h-6 w-6" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href!}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-6 w-6" />
            <span className="text-[11px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}