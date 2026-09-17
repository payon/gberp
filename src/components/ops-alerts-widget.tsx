"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Alert = {
  id: string;
  severity: "danger" | "warn" | "info";
  title: string;
  desc: string;
  link: string;
};

const STYLES: Record<string, { border: string; bg: string; text: string; icon: any }> = {
  danger: { border: "border-red-200 bg-red-50", bg: "bg-red-600", text: "text-red-700", icon: AlertCircle },
  warn: { border: "border-amber-200 bg-amber-50", bg: "bg-amber-500", text: "text-amber-800", icon: AlertTriangle },
  info: { border: "border-blue-200 bg-blue-50", bg: "bg-blue-500", text: "text-blue-700", icon: Info },
};

export function OpsAlertsWidget() {
  const { data, error } = useQuery({
    queryKey: ["ops-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/ops-alerts", { cache: "no-store" });
      if (res.status === 403 || res.status === 409) return null;
      if (!res.ok) throw new Error("알림 로드 실패");
      const j = await res.json();
      return (j.data ?? []) as Alert[];
    },
    refetchInterval: 60_000,
  });

  if (error || data === null || data === undefined) return null;
  if (data.length === 0) return null;

  return (
    <Card className="border-red-200/60 bg-red-50/40">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">운영 알림</CardTitle>
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
          {data.length}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((a) => {
          const s = STYLES[a.severity] ?? STYLES.info;
          const Icon = s.icon;
          return (
            <Link
              key={a.id}
              href={a.link}
              className={cn("block rounded-lg border p-3 transition-colors hover:opacity-85", s.border)}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.text)} />
                <div className="min-w-0">
                  <div className={cn("text-sm font-semibold", s.text)}>{a.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{a.desc}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}