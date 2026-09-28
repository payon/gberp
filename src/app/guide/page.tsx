"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TtsButton } from "@/components/tts-button";
import { primeVoices, speakQueued, stopSpeaking } from "@/lib/tts";
import { buildDriverSpeech } from "@/lib/speech";
import { showNotification } from "@/lib/push-client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  BusFront,
  CalendarDays,
  Clock,
  Flag,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";

const AUTO_KEY = "gb:guide-auto-announce";
const SEEN_KEY = "gb:guide-seen-dispatch";

type GuideDispatch = {
  id: string;
  status: string;
  statusVariant: string;
  statusLabel: string;
  productName: string;
  clientName: string;
  participants: number;
  startYmd: string;
  startDate: string;
  startTime: string;
  endTime: string;
  actualStart: string | null;
  actualEnd: string | null;
  departureLocation: string;
  arrivalLocation: string;
  stops: { stopName: string; stopTime: string; note: string }[];
  stopsText: string[];
  warningsList: string[];
  plateNumber: string;
  vehicleType: string;
  driverName: string;
  specialConditions: string;
  notes: string;
};

function loadSeen(): Set<string> {
  const s = new Set<string>();
  if (typeof window === "undefined") return s;
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach((v: string) => s.add(String(v)));
    }
  } catch {
    /* ignore */
  }
  return s;
}

function saveSeen(s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

function speechFor(d: GuideDispatch): string {
  return buildDriverSpeech({
    scheduleName: d.productName,
    startText: `${d.startDate} ${d.startTime}`.trim(),
    departureLocation: d.departureLocation,
    arrivalLocation: d.arrivalLocation,
    stops: d.stopsText,
    plateNumber: d.plateNumber,
    driverName: d.driverName,
    specialConditions: d.specialConditions,
  });
}

type VoicePrefs = { defaultRate: number; autoAnnounce: boolean };

export default function GuidePage() {
  const { data: session } = useSession();
  const [autoOverride, setAutoOverride] = useState<boolean | null>(() => {
    try {
      const raw = localStorage.getItem(AUTO_KEY);
      return raw === null ? null : raw === "1";
    } catch {
      return null;
    }
  });
  const [announcing, setAnnouncing] = useState(false);
  const autoRef = useRef(false);
  const rateRef = useRef(0.95);
  const seen = useRef<Set<string>>(loadSeen());
  const timer = useRef<number | null>(null);

  useEffect(() => {
    primeVoices();
    const unlock = () => primeVoices();
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["guide-dispatches"],
    queryFn: async () => {
      const res = await fetch("/api/driver/dispatches?range=upcoming");
      if (!res.ok) throw new Error("불러오기 실패");
      const json = await res.json();
      return {
        list: (json.data ?? []) as GuideDispatch[],
        holiday: json.todayHoliday as { date: string; name: string } | null,
        voice: json.voice as VoicePrefs | undefined,
      };
    },
    refetchInterval: 60000,
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const statusMut = useMutation({
    mutationFn: async ({
      id,
      action,
      runLog,
    }: {
      id: string;
      action: "start" | "end";
      runLog?: { endOdometer?: number; notes?: string; issues?: string };
    }) => {
      const res = await fetch(`/api/driver/dispatches/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, runLog }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "상태 변경에 실패했습니다.");
      }
      return res.json();
    },
    onMutate: ({ id }) => setBusyId(id),
    onSuccess: (_data, vars) => {
      toast.success(vars.action === "start" ? "운행을 시작했습니다." : "운행을 종료했습니다.");
      setBusyId(null);
      refetch();
    },
    onError: (e: Error) => {
      setBusyId(null);
      toast.error(e.message);
    },
  });

  const { data: features } = useQuery({
    queryKey: ["features"],
    queryFn: async () => {
      const res = await fetch("/api/features", { cache: "no-store" });
      return res.json().catch(() => ({}));
    },
    staleTime: 60_000,
  });
  const [endDraft, setEndDraft] = useState<string | null>(null);

  const handleStatus = useCallback(
    (id: string, action: "start" | "end") => {
      if (action === "end" && features?.runLog) {
        setEndDraft(id);
        return;
      }
      statusMut.mutate({ id, action });
    },
    [statusMut, features]
  );

  const auto = autoOverride ?? (data?.voice?.autoAnnounce ?? false);
  const list = data?.list ?? [];
  const todayHoliday = data?.holiday ?? null;

  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);

  useEffect(() => {
    if (data?.voice?.defaultRate) rateRef.current = data.voice.defaultRate;
  }, [data?.voice]);

  const toggleAuto = useCallback(() => {
    const next = !auto;
    setAutoOverride(next);
    autoRef.current = next;
    try {
      localStorage.setItem(AUTO_KEY, next ? "1" : "0");
    } catch {}
  }, [auto]);

  const today = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    return list.filter((d) => d.startYmd === key || d.status === "IN_PROGRESS");
  }, [list]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    return list.filter((d) => d.startYmd !== key).slice(0, 10);
  }, [list]);

  const hasToday = today.length > 0;

  const clearAnnounce = useCallback(() => {
    stopSpeaking();
    setAnnouncing(false);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const announceAll = useCallback(() => {
    const texts = hasToday
      ? today.map(speechFor)
      : ["오늘은 예정된 배차가 없습니다. 안전 운행하세요."];
    speakQueued(texts, { rate: rateRef.current });
    setAnnouncing(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setAnnouncing(false),
      (texts.length + 2) * 14000
    );
  }, [today, hasToday]);

  const announceNew = useCallback(() => {
    if (!autoRef.current || today.length === 0) return;
    const fresh = today.filter(
      (d) =>
        !seen.current.has(d.id) &&
        (d.status === "CONFIRMED" || d.status === "IN_PROGRESS")
    );
    if (fresh.length === 0) return;
    fresh.forEach((d) => seen.current.add(d.id));
    saveSeen(seen.current);
    const texts = fresh.map(speechFor);
    speakQueued(texts, { rate: rateRef.current });
    setAnnouncing(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => setAnnouncing(false),
      (texts.length + 2) * 14000
    );
    const head = fresh[0];
    showNotification(
      "새 배차 안내",
      `${head.clientName} · ${head.productName} · ${head.startTime} 출발`,
      "/guide"
    );
  }, [today]);

  useEffect(() => {
    if (!list || list.length === 0) return;
    list.forEach((d) => {
      if (d.status === "CONFIRMED" || d.status === "IN_PROGRESS") {
        seen.current.add(d.id);
      }
    });
    const t = window.setTimeout(announceNew, 2500);
    return () => window.clearTimeout(t);
  }, [list, announceNew]);

  useEffect(
    () => () => {
      clearAnnounce();
    },
    [clearAnnounce]
  );

  const name = session?.user?.name?.split(" ")[0] || "가이드";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "좋은 아침입니다" : hour < 18 ? "안녕하세요" : "수고 많으세요";

  return (
    <div className="space-y-5">
      {todayHoliday && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <CalendarDays className="h-6 w-6 shrink-0 text-amber-600" />
          <div>
            <div className="font-bold text-amber-800">오늘은 휴일입니다</div>
            <div className="text-sm text-amber-700">
              {todayHoliday.date}
              {todayHoliday.name ? ` · ${todayHoliday.name}` : ""}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">
            {greeting}, {name}님
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            오늘 배차 {today.length}건 · 전체 {list.length}건
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="새로고침"
          className="h-11 w-11"
        >
          <RefreshCw className={cn("h-5 w-5", isFetching && "animate-spin")} />
        </Button>
      </div>

      <Card className="border-primary/30">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <Volume2 className="h-9 w-9 text-primary" />
            <div className="text-lg font-extrabold">전체 음성 안내</div>
            <p className="text-sm text-muted-foreground">
              {hasToday
                ? `오늘 배차 ${today.length}건을 큰 소리로 읽어드립니다.`
                : "오늘은 예정된 배차가 없습니다."}
            </p>
          </div>
          <Button
            size="lg"
            className="h-16 w-full text-lg"
            onClick={announceAll}
            disabled={announcing}
          >
            <Volume2 className="h-6 w-6" />
            {announcing ? "안내 재생 중..." : "🔊 전체 음성 안내 듣기"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full text-base"
            onClick={clearAnnounce}
            disabled={!announcing}
          >
            <VolumeX className="h-5 w-5" /> 음성 중지
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div className="min-w-0">
          <div className="font-bold">자동 음성 안내</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            새 배차가 내려오면 자동으로 읽어드립니다 (1분마다 확인)
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={auto}
          onClick={() => toggleAuto()}
          className={cn(
            "relative h-9 w-16 shrink-0 rounded-full transition-colors",
            auto ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all",
              auto ? "left-8" : "left-1"
            )}
          />
        </button>
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
          <CalendarDays className="h-5 w-5 text-primary" /> 오늘 배차
        </h2>
        {today.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              오늘은 예정된 배차가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {today.map((d) => (
              <DispatchCard key={d.id} d={d} onStatus={handleStatus} busy={busyId === d.id} />
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <Clock className="h-5 w-5 text-primary" /> 예정 배차
          </h2>
          <div className="space-y-3">
            {upcoming.map((d) => (
              <DispatchCard key={d.id} d={d} compact onStatus={handleStatus} busy={busyId === d.id} />
            ))}
          </div>
        </section>
      )}

      {endDraft && (
        <EndRunDialog
          info={list.find((d) => d.id === endDraft)}
          onClose={() => setEndDraft(null)}
          onSubmit={(runLog) => {
            const id = endDraft;
            setEndDraft(null);
            statusMut.mutate({ id, action: "end", runLog });
          }}
        />
      )}
    </div>
  );
}

function EndRunDialog({
  info,
  onClose,
  onSubmit,
}: {
  info?: GuideDispatch;
  onClose: () => void;
  onSubmit: (runLog: { endOdometer?: number; notes?: string; issues?: string }) => void;
}) {
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [issues, setIssues] = useState("");
  const odometerNum = odometer.trim() === "" ? undefined : Number(odometer);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>운행 종료 · 운행일지 작성</DialogTitle>
          <DialogDescription>
            {info?.plateNumber || ""} {info?.productName || ""} 운행을 마쳤습니다. 종료 기록을 남겨주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">종료 주행거리 (km)</label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="예: 128450"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">특이사항 / 이슈 (선택)</label>
            <Textarea rows={2} placeholder="예: 일정 지연 10분, 인원 변경" value={issues} onChange={(e) => setIssues(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">운행 메모 (선택)</label>
            <Textarea rows={2} placeholder="예: 오전 일정 순조로움" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => onSubmit({ endOdometer: Number.isFinite(odometerNum) ? odometerNum : undefined, notes: notes.trim() || undefined, issues: issues.trim() || undefined })}>
            <Flag className="h-4 w-4" /> 종료 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DispatchCard({
  d,
  compact,
  onStatus,
  busy,
}: {
  d: GuideDispatch;
  compact?: boolean;
  onStatus?: (id: string, action: "start" | "end") => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const text = speechFor(d);
  const fmtTime = (iso: string | null) => {
    if (!iso) return "";
    const dt = new Date(iso);
    return `${dt.getHours() < 12 ? "오전" : "오후"} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold">{d.productName || "배차"}</span>
              <Badge variant={d.statusVariant as any}>{d.statusLabel}</Badge>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {d.clientName} · {d.startDate} {d.startTime} → {d.endTime}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/60 p-2">
            <div className="text-[11px] text-muted-foreground">출발지</div>
            <div className="font-medium">{d.departureLocation || "-"}</div>
          </div>
          <div className="rounded-lg bg-muted/60 p-2">
            <div className="text-[11px] text-muted-foreground">도착지</div>
            <div className="font-medium">{d.arrivalLocation || "-"}</div>
          </div>
        </div>

        {d.stopsText.length > 0 && (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <MapPin className="h-4 w-4" /> 중간 정차 ({d.stopsText.length}곳)
            </div>
            <ol className="space-y-1 text-sm">
              {d.stops.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium">{s.stopName}</span>
                    {s.stopTime && <span className="ml-1.5 text-muted-foreground">{s.stopTime}</span>}
                    {s.note && <span className="ml-1.5 text-muted-foreground">({s.note})</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {d.warningsList.length > 0 && (
          <div className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {d.warningsList.map((w, i) => (
              <p key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold">
            <BusFront className="h-4 w-4" /> {d.plateNumber || "-"}
            {d.vehicleType && (
              <span className="text-muted-foreground">({d.vehicleType})</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" /> {d.participants ?? 0}명
          </span>
          {d.driverName && d.driverName !== "-" && (
            <span className="text-muted-foreground">기사: {d.driverName}</span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <TtsButton text={text} size="lg" className="flex-1" />
          {!compact && (
            <Button variant="outline" size="lg" onClick={() => setOpen((v) => !v)}>
              상세
            </Button>
          )}
        </div>

        {(d.status === "IN_PROGRESS" || d.status === "COMPLETED") && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            {d.actualStart && <span>출발 {fmtTime(d.actualStart)}</span>}
            {d.actualEnd && <span>도착 {fmtTime(d.actualEnd)}</span>}
          </div>
        )}

        {onStatus && (d.status === "PENDING" || d.status === "CONFIRMED") && (
          <Button
            size="lg"
            className="mt-3 w-full"
            disabled={busy}
            onClick={() => onStatus(d.id, "start")}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            운행 시작
          </Button>
        )}

        {onStatus && d.status === "IN_PROGRESS" && (
          <Button
            variant="outline"
            size="lg"
            className="mt-3 w-full"
            disabled={busy}
            onClick={() => onStatus(d.id, "end")}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Flag className="h-5 w-5" />}
            운행 종료
          </Button>
        )}

        {open && (d.specialConditions || d.notes) && (
          <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            {d.specialConditions && (
              <p>
                <span className="font-semibold text-amber-800">특이사항:</span>{" "}
                {d.specialConditions}
              </p>
            )}
            {d.notes && (
              <p>
                <span className="font-semibold text-amber-800">메모:</span> {d.notes}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
