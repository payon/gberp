"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DISPATCH_STATUS_LABELS } from "@/lib/resources";

type CalDispatch = {
  id: string;
  scheduleName: string;
  driverName: string;
  plateNumber: string;
  guideName: string;
  scheduledStart: string;
  scheduledEnd: string;
  departureLocation: string;
  arrivalLocation: string;
  status: string;
  warningsList: string[];
};

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-blue-500",
  IN_PROGRESS: "bg-emerald-500",
  COMPLETED: "bg-slate-400",
  CANCELLED: "bg-red-400",
  FAILED: "bg-red-600",
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEK_START = 0; // 일요일 시작

function ymdKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DispatchCalendar() {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  const monthParam = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
  const { data, isLoading } = useQuery({
    queryKey: ["cal-dispatches", monthParam],
    queryFn: async () => {
      const res = await fetch(`/api/dispatches?month=${monthParam}`, { cache: "no-store" });
      if (!res.ok) throw new Error("배차 조회 실패");
      return res.json();
    },
  });

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (string | null)[] = [];
    for (let i = 0; i < ((firstDow - WEEK_START + 7) % 7); i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(ymdKey(new Date(year, month, d)));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalDispatch[]>();
    for (const d of (data?.data ?? []) as CalDispatch[]) {
      const key = ymdKey(new Date(d.scheduledStart));
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    }
    return map;
  }, [data]);

  const selectedList = selected ? (byDay.get(selected) ?? []) : [];
  const todayKey = ymdKey(today);

  const move = (delta: number) => {
    setSelected(null);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">
                {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => move(-1)} aria-label="이전 달">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelected(null); setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); }}>
                오늘
              </Button>
              <Button variant="outline" size="sm" onClick={() => move(1)} aria-label="다음 달">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1">
                {DAY_LABELS.map((l, i) => (
                  <div key={l} className={cn("py-1 text-center text-xs font-semibold", i === 0 && "text-destructive")}>
                    {l}
                  </div>
                ))}
                {cells.map((key, i) => {
                  if (!key) return <div key={`x-${i}`} className="min-h-[88px] rounded-lg bg-muted/30" />;
                  const list = byDay.get(key) ?? [];
                  const isToday = key === todayKey;
                  const isSelected = key === selected;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(isSelected ? null : key)}
                      className={cn(
                        "flex min-h-[88px] flex-col items-stretch gap-1 rounded-lg border p-1 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-transparent hover:border-border hover:bg-muted/50",
                        isToday && !isSelected && "border-primary/50"
                      )}
                    >
                      <span className={cn("px-1 text-xs font-semibold", key === ymdKey(today) && "text-primary")}>
                        {Number(key.slice(8))}
                      </span>
                      <span className="flex flex-col gap-0.5 overflow-hidden">
                        {list.slice(0, 3).map((d) => (
                          <span key={d.id} className="flex items-center gap-1 text-[10px] leading-tight">
                            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[d.status] ?? "bg-muted")} />
                            <span className="truncate">
                              {d.driverName !== "-" ? d.driverName : d.plateNumber}
                              <span className="text-muted-foreground">
                                {" "}
                                {new Date(d.scheduledStart).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </span>
                          </span>
                        ))}
                      </span>
                      {list.length > 3 && (
                        <span className="px-1 text-[10px] text-muted-foreground">+{list.length - 3}건</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {Object.entries(DISPATCH_STATUS_LABELS)
                  .filter(([k]) => k !== "CANCELLED" && k !== "FAILED")
                  .map(([k, label]) => (
                    <span key={k} className="flex items-center gap-1">
                      <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[k])} /> {label}
                    </span>
                  ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h4 className="mb-3 font-semibold">{selected ? `${selected.slice(0, 4)}년 ${Number(selected.slice(5, 7))}월 ${Number(selected.slice(8))}일` : `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월 일정`}</h4>
          {selected && selectedList.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">배차 없음</p>
          ) : !selected ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              날짜를 선택하면 해당일 배차를 확인할 수 있습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedList.map((d) => (
                <div key={d.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{d.scheduleName}</span>
                    <Badge variant={d.status === "IN_PROGRESS" ? "info" : d.status === "COMPLETED" ? "secondary" : "warning"}>
                      {DISPATCH_STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <div>
                      {new Date(d.scheduledStart).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} ~
                      {new Date(d.scheduledEnd).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="font-medium text-foreground">
                      {d.driverName !== "-" ? d.driverName : "-"} · {d.plateNumber}
                    </div>
                    {(d.guideName && d.guideName !== "-") && <div>가이드: {d.guideName}</div>}
                    {d.departureLocation && <div>출발: {d.departureLocation}</div>}
                    {d.arrivalLocation && <div>도착: {d.arrivalLocation}</div>}
                  </div>
                  {d.warningsList?.length > 0 && (
                    <div className="mt-1 text-[11px] text-amber-600">{d.warningsList.join(" / ")}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}