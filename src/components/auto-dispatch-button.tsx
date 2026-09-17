"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, User, Car, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Candidate = { id: string; name: string; detail: string; score: number; reasons: string[] };
type SchedOpt = { value: string; label: string };

export function AutoDispatchButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [scheduleId, setScheduleId] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: schedules = [] } = useQuery({
    queryKey: ["options", "schedules"],
    queryFn: async () => {
      const res = await fetch("/api/schedules?all=1");
      const j = await res.json();
      return (j.options ?? []) as SchedOpt[];
    },
    staleTime: 60_000,
  });

  const loadPlan = async () => {
    if (!scheduleId) {
      toast.error("일정을 선택해주세요.");
      return;
    }
    setLoadingPlan(true);
    setDriverId("");
    setVehicleId("");
    try {
      const res = await fetch(`/api/dispatch-recommend?scheduleId=${encodeURIComponent(scheduleId)}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "추천을 불러오지 못했습니다.");
      setPlan(j);
      if (j.data?.drivers?.[0]) setDriverId(j.data.drivers[0].id);
      if (j.data?.vehicles?.[0]) setVehicleId(j.data.vehicles[0].id);
    } catch (e: any) {
      toast.error(e?.message ?? "추천 실패");
      setPlan(null);
    } finally {
      setLoadingPlan(false);
    }
  };

  const create = async () => {
    if (!plan || !driverId || !vehicleId) {
      toast.error("기사와 차량을 선택해주세요.");
      return;
    }
    setCreating(true);
    try {
      const driver = plan.data.drivers.find((d: Candidate) => d.id === driverId);
      const res = await fetch("/api/dispatch-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: plan.schedule.id,
          driverId,
          vehicleId,
          score: (driver?.score ?? 0) + (plan.data.vehicles.find((v: Candidate) => v.id === vehicleId)?.score ?? 0),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error ?? "생성 실패");
      toast.success("추천 배차가 등록되었습니다.");
      if (j.warning) toast.warning(j.warning);
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["cal-dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setOpen(false);
      setPlan(null);
      setScheduleId("");
    } catch (e: any) {
      toast.error(e?.message ?? "배차 생성 실패");
    } finally {
      setCreating(false);
    }
  };

  const pickedScore = (() => {
    if (!plan) return 0;
    const d = plan.data.drivers.find((x: Candidate) => x.id === driverId)?.score ?? 0;
    const v = plan.data.vehicles.find((x: Candidate) => x.id === vehicleId)?.score ?? 0;
    return d + v;
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">자동 배차</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>반자동 배차 추천</DialogTitle>
          <DialogDescription>
            일정을 고르면 적합한 기사·차량을 점수순으로 안내합니다. 운영자가 조합을 확인하고 배차를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">일정 *</label>
              <Select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
                <option value="">선택해주세요</option>
                {schedules.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={loadPlan} disabled={loadingPlan}>
              {loadingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              추천 받기
            </Button>
          </div>

          {plan && (
            <>
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="font-semibold">{plan.schedule.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {new Date(plan.schedule.start).toLocaleString("ko-KR")} ~{" "}
                  {new Date(plan.schedule.end).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} · 인원{" "}
                  {plan.schedule.participants}명
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <User className="h-4 w-4 text-primary" /> 기사 추천
                </div>
                {plan.data.drivers.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    추천 가능한 기사가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {plan.data.drivers.map((d: Candidate) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDriverId(d.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border p-3 text-left transition-colors",
                          driverId === d.id ? "border-primary bg-primary/10" : "hover:border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-medium">
                            {d.name}
                            <Badge variant="secondary">{d.score}점</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{d.detail}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{d.reasons.join(" · ")}</div>
                        </div>
                        {driverId === d.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <Car className="h-4 w-4 text-primary" /> 차량 추천
                </div>
                {plan.data.vehicles.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    추천 가능한 차량이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {plan.data.vehicles.map((v: Candidate) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicleId(v.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border p-3 text-left transition-colors",
                          vehicleId === v.id ? "border-primary bg-primary/10" : "hover:border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-medium">
                            {v.name}
                            <Badge variant="secondary">{v.score}점</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{v.detail}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">{v.reasons.join(" · ")}</div>
                        </div>
                        {vehicleId === v.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="items-center gap-3">
          {plan && (
            <span className="mr-auto text-sm text-muted-foreground">
              조합 점수 <strong>{pickedScore}</strong>점으로 등록합니다
            </span>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button onClick={create} disabled={!plan || !driverId || !vehicleId || creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            이 조합으로 등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}