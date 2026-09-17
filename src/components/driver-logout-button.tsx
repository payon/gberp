"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DriverLogoutButton() {
  const [busy, setBusy] = useState(false);

  const handleLogout = () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    setBusy(true);
    signOut({ callbackUrl: "/login" });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="gap-1 text-muted-foreground"
      aria-label="로그아웃"
      disabled={busy}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <span className="hidden sm:inline">로그아웃</span>
    </Button>
  );
}