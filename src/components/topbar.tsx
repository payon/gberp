"use client";

import { usePathname } from "next/navigation";
import { MENU } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";

export function Topbar({ role }: { role?: string }) {
  const pathname = usePathname();
  const item = MENU.find((m) => m.href === pathname) ?? (pathname === "/dashboard" ? MENU[0] : undefined);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold">{item?.label ?? "업무 관리"}</h1>
        {item ? <p className="text-xs text-muted-foreground">{item.href}</p> : null}
      </div>
      <Badge variant="secondary" className="px-3 py-1">
        {item?.group ?? "시스템"}
      </Badge>
    </header>
  );
}