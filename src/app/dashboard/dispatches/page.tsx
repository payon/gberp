"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, List, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ResourceWrapper } from "@/components/resource-wrapper";
import { ResourceExcelActions } from "@/components/resource-excel-actions";
import { DispatchCalendar, DispatchMonitor } from "@/components/dispatch-calendar";
import { AutoDispatchButton } from "@/components/auto-dispatch-button";

export default function DispatchesPage() {
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [monitor, setMonitor] = useState(false);
  const { data: features } = useQuery({
    queryKey: ["features"],
    queryFn: async () => {
      const res = await fetch("/api/features", { cache: "no-store" });
      return res.json();
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">배차 관리</h2>
          <p className="text-sm text-muted-foreground">일정에 기사/차량을 배정하고 캘린더에서 통합 관제합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          {features?.semiAutoDispatch && <AutoDispatchButton />}
          <div className="flex rounded-lg border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "calendar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <CalendarRange className="h-4 w-4" /> 캘린더
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <List className="h-4 w-4" /> 목록
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonitor(true)}
            className="gap-1.5"
            aria-label="전체 화면 관제 모드"
          >
            <Monitor className="h-4 w-4" /> 관제 모드
          </Button>
        </div>
      </div>

      {monitor && <DispatchMonitor onClose={() => setMonitor(false)} />}
      {!monitor && (
        <>
          {view === "calendar" ? (
            <DispatchCalendar />
          ) : (
            <ResourceWrapper
              resource="dispatches"
              headerActions={<ResourceExcelActions resource="dispatches" />}
            />
          )}
        </>
      )}
    </div>
  );
}