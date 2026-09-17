"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/settings-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2,
  Volume2,
  Truck,
  CalendarDays,
  Loader2,
  Save,
  Upload,
  Trash2,
  Plus,
  ImageIcon,
  FileText,
  FileUp,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { parseHolidayList, validateHolidays, type HolidayRow } from "@/lib/holidays";
import { FEATURE_DEFS, featureSettingKey } from "@/lib/features";

type TabKey = "company" | "voice" | "dispatch" | "holidays" | "documents" | "features";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "company", label: "업체 정보", icon: Building2 },
  { key: "voice", label: "알림·음성", icon: Volume2 },
  { key: "dispatch", label: "배차 규칙", icon: Truck },
  { key: "holidays", label: "휴일", icon: CalendarDays },
  { key: "documents", label: "문서", icon: FileText },
  { key: "features", label: "기능", icon: SlidersHorizontal },
];

type FieldDef = { key: string; label: string; type?: "text" | "tel" | "email" | "number"; full?: boolean; hint?: string; placeholder?: string };

const COMPANY_FIELDS: FieldDef[] = [
  { key: "company.name", label: "회사명", type: "text", placeholder: "종합여행사" },
  { key: "company.registrationNumber", label: "사업자등록번호", type: "text", placeholder: "000-00-00000" },
  { key: "company.ceoName", label: "대표자명", type: "text" },
  { key: "company.phone", label: "대표전화", type: "tel", placeholder: "02-000-0000" },
  { key: "company.fax", label: "팩스", type: "tel", placeholder: "02-000-0000" },
  { key: "company.email", label: "이메일", type: "email" },
  { key: "company.businessType", label: "업태", type: "text", placeholder: "운수 여행업" },
  { key: "company.businessItem", label: "업종", type: "text", placeholder: "전세버스 운송사업" },
  { key: "company.address", label: "주소", type: "text", full: true, placeholder: "서울특별시 ..." },
];

const VOICE_FIELDS: FieldDef[] = [
  { key: "voice.defaultRate", label: "기본 음성 빠르기 (배수)", type: "number", hint: "0.5 ~ 1.5 (기본 0.95). 기사님이 앱에서 개별 조정할 수 있습니다." },
];

const DISPATCH_FIELDS: FieldDef[] = [
  { key: "dispatch.defaultRestHours", label: "기본 휴게 시간 (시간)", type: "number", hint: "출퇴근/학교 운행 시 최소 휴게시간 기준입니다." },
];

export default function SettingsPage() {
  const router = useRouter();
  const { settings, refresh } = useSettings();
  const [tab, setTab] = useState<TabKey>("company");
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const specFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (res.status === 403) {
          toast.error("권한이 없습니다.");
          router.replace("/dashboard");
          return;
        }
        if (!res.ok) {
          toast.error("설정을 불러오지 못했습니다.");
          return;
        }
        const data = await res.json();
        if (data?.settings) {
          setValues(data.settings);
          setHolidays(parseHolidayList(data.settings["holidays.list"] ?? "[]"));
        }
      } catch {
        toast.error("설정을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const setField = useCallback((key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  }, []);

  const doSave = useCallback(async () => {
    const holidayError = validateHolidays(holidays);
    if (holidayError) {
      toast.error(holidayError);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...values, "holidays.list": JSON.stringify(holidays) };
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "저장에 실패했습니다.");
      }
      const data = await res.json();
      if (data?.settings) {
        setValues(data.settings);
        setHolidays(parseHolidayList(data.settings["holidays.list"] ?? "[]"));
      }
      refresh();
      router.refresh();
      toast.success("설정이 저장되었습니다.");
    } catch (e: any) {
      toast.error(e?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [values, holidays, refresh, router]);

  const onUploadLogo = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const res = await fetch("/api/upload/logo", {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "업로드에 실패했습니다.");
        }
        const data = await res.json();
        setValues((prev) => ({ ...prev, "company.logoPath": data.path }));
        refresh();
        router.refresh();
        toast.success("로고가 적용되었습니다.");
      } catch (e: any) {
        toast.error(e?.message || "업로드에 실패했습니다.");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [refresh, router]
  );

  const onDeleteLogo = useCallback(async () => {
    try {
      const res = await fetch("/api/upload/logo", { method: "DELETE" });
      if (!res.ok) throw new Error("삭제에 실패했습니다.");
      setValues((prev) => ({ ...prev, "company.logoPath": "" }));
      refresh();
      router.refresh();
      toast.success("로고가 삭제되었습니다.");
    } catch (e: any) {
      toast.error(e?.message || "삭제에 실패했습니다.");
    }
  }, [refresh, router]);

  const onUploadSpec = useCallback(
    async (file: File) => {
      setUploadingSpec(true);
      try {
        const res = await fetch("/api/upload/spec", {
          method: "POST",
          headers: { "x-file-name": encodeURIComponent(file.name) },
          body: file,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "업로드에 실패했습니다.");
        }
        const data = await res.json();
        setValues((prev) => ({
          ...prev,
          "document.specPath": data.path ?? "",
          "document.specName": data.name ?? "",
        }));
        refresh();
        router.refresh();
        toast.success("규격서가 등록되었습니다.");
      } catch (e: any) {
        toast.error(e?.message || "업로드에 실패했습니다.");
      } finally {
        setUploadingSpec(false);
        if (specFileRef.current) specFileRef.current.value = "";
      }
    },
    [refresh, router]
  );

  const onDeleteSpec = useCallback(async () => {
    try {
      const res = await fetch("/api/upload/spec", { method: "DELETE" });
      if (!res.ok) throw new Error("삭제에 실패했습니다.");
      setValues((prev) => ({ ...prev, "document.specPath": "", "document.specName": "" }));
      refresh();
      router.refresh();
      toast.success("규격서가 삭제되었습니다.");
    } catch (e: any) {
      toast.error(e?.message || "삭제에 실패했습니다.");
    }
  }, [refresh, router]);

  const addHoliday = () => {
    setHolidays((prev) => [...prev, { date: "", name: "" }]);
  };

  const updateHoliday = (i: number, patch: Partial<HolidayRow>) => {
    setHolidays((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  };

  const removeHoliday = (i: number) => {
    setHolidays((prev) => prev.filter((_, idx) => idx !== i));
  };

  const sortedHolidayIndices = holidays
    .map((_, i) => i)
    .sort((a, b) => (holidays[a].date || "9999").localeCompare(holidays[b].date || "9999"));

  const logoPath = values["company.logoPath"] ?? "";

  const renderFields = (fields: FieldDef[]) => (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key} className={cn("space-y-1.5", f.full && "md:col-span-2")}>
          <Label htmlFor={f.key}>{f.label}</Label>
          <Input
            id={f.key}
            type={f.type ?? "text"}
            value={values[f.key] ?? ""}
            onChange={(e) => setField(f.key, e.target.value)}
            placeholder={f.placeholder}
          />
          {f.hint ? <p className="text-xs text-muted-foreground">{f.hint}</p> : null}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">업체 설정</h1>
          <p className="text-sm text-muted-foreground">회사 정보와 시스템 기본값을 관리합니다. 저장 시 앱 전체에 즉시 반영됩니다.</p>
        </div>
        <Button onClick={doSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "저장 중..." : "저장"}
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border bg-muted/30 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-5">
          {tab === "company" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {logoPath ? (
                  <img src={logoPath} alt="로고" className="h-16 w-16 rounded-xl border object-contain" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-muted/40">
                    <ImageIcon className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadLogo(f);
                    }}
                  />
                  <Button
                    variant="outline"
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "업로드 중..." : "로고 업로드"}
                  </Button>
                  {logoPath ? (
                    <Button variant="ghost" size="sm" type="button" className="text-destructive" onClick={onDeleteLogo}>
                      <Trash2 className="h-4 w-4" /> 로고 삭제
                    </Button>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    사이트 크기에 맞게 자동으로 리사이즈됩니다. (PNG 권장, 투명 배경 지원)
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">{renderFields(COMPANY_FIELDS)}</div>
            </div>
          )}

          {tab === "voice" && (
            <div className="space-y-6">
              <div className="md:max-w-sm">{renderFields(VOICE_FIELDS)}</div>
              <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
                <div>
                  <div className="font-bold">기본 자동 음성 안내</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    새 배차가 내려오면 자동으로 읽어주는 기능의 기본값입니다. 기사님이 앱에서 개별 설정할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={(values["voice.autoAnnounce"] ?? "true") === "true"}
                  onClick={() => setField("voice.autoAnnounce", (values["voice.autoAnnounce"] ?? "true") === "true" ? "false" : "true")}
                  className={cn(
                    "relative h-9 w-16 shrink-0 rounded-full transition-colors",
                    (values["voice.autoAnnounce"] ?? "true") === "true" ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all",
                      (values["voice.autoAnnounce"] ?? "true") === "true" ? "left-8" : "left-1"
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          {tab === "dispatch" && (
            <div className="space-y-6">
              <div className="md:max-w-sm">{renderFields(DISPATCH_FIELDS)}</div>
              <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">배차 시 자동 확인</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>같은 기사의 같은 시간대 중복 배차를 자동으로 차단합니다.</li>
                  <li>휴일 설정 시 해당 날짜 배차 생성 시 경고를 표시합니다.</li>
                  <li>차량/기사 상태가 운행 가능한지 확인합니다.</li>
                </ul>
              </div>
            </div>
          )}

          {tab === "holidays" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  휴일로 등록된 날짜는 기사/가이드 앱에 표시되고, 배차 생성 시 경고됩니다.
                </p>
                <Button variant="outline" size="sm" type="button" onClick={addHoliday}>
                  <Plus className="h-4 w-4" /> 휴일 추가
                </Button>
              </div>
              {sortedHolidayIndices.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  등록된 휴일이 없습니다. &quot;휴일 추가&quot;로 대체공휴일·자체 휴일을 등록하세요.
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedHolidayIndices.map((rowIndex) => {
                    const h = holidays[rowIndex];
                    return (
                      <div key={rowIndex} className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={h.date}
                          onChange={(e) => updateHoliday(rowIndex, { date: e.target.value })}
                          className="w-auto"
                        />
                        <Input
                          type="text"
                          value={h.name}
                          placeholder="휴일 이름 (예: 추석연휴, 하계휴무)"
                          onChange={(e) => updateHoliday(rowIndex, { name: e.target.value })}
                        />
                        <Button variant="ghost" size="icon" type="button" onClick={() => removeHoliday(rowIndex)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "documents" && (
            <div className="space-y-6">
              <div className="rounded-xl bg-muted/50 p-5">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">샘플 규격서</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  현재 업무에서 사용하는 표준 계약서·견적서·운행표 규격서 파일을 업로드합니다.
                  업로드한 규격서를 기준으로 추후 계약서/문서 인쇄 양식과 엑셀 양식을 자동 맞춤 구현하는 데 활용됩니다.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    ref={specFileRef}
                    type="file"
                    accept=".pdf,.xls,.xlsx,.doc,.docx,.hwp,.hwpx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadSpec(file);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={uploadingSpec}
                    onClick={() => specFileRef.current?.click()}
                  >
                    {uploadingSpec ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                    {uploadingSpec ? "업로드 중..." : "규격서 업로드"}
                  </Button>
                  {values["document.specName"] && (
                    <>
                      <span className="inline-flex max-w-[260px] items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{values["document.specName"]}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        title="규격서 삭제"
                        onClick={onDeleteSpec}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  지원 형식: PDF, Excel, Word, 한글(HWP/HWPX), PNG/JPG · 최대 20MB
                </p>
              </div>
            </div>
          )}

          {tab === "features" && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  기능별 활성화를 설정합니다. 꺼둔 기능은 UI와 서버 처리 모두 동작하지 않습니다. 저장 시 즉시 반영됩니다.
                </p>
              </div>
              <div className="space-y-2">
                {FEATURE_DEFS.map((f) => {
                  const on = (values[featureSettingKey(f.key)] ?? String(f.default)) === "true";
                  return (
                    <div key={f.key} className="flex items-center justify-between gap-3 rounded-xl border p-4">
                      <div>
                        <div className="font-semibold">{f.label}</div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{f.description}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`${f.label} 활성화`}
                        onClick={() => setField(featureSettingKey(f.key), on ? "false" : "true")}
                        className={cn(
                          "relative h-9 w-16 shrink-0 rounded-full transition-colors",
                          on ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all",
                            on ? "left-8" : "left-1"
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border p-4">
                <div className="mb-3 font-semibold">SMS 게이트웨이</div>
                <p className="mb-3 text-sm text-muted-foreground">
                  "SMS 자동 발송" 기능을 켤 때 사용할 연동 정보입니다. 게이트웨이 URL에
                  <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">{"{phone}"}</code>
                  <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">{"{message}"}</code>를
                  쿼리로 전달합니다. 비워 두면 내부 알림 큐(NotificationQueue·channel=SMS)에만 기록합니다.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="sms.gatewayUrl">게이트웨이 URL</Label>
                    <Input
                      id="sms.gatewayUrl"
                      type="text"
                      value={values["sms.gatewayUrl"] ?? ""}
                      onChange={(e) => setField("sms.gatewayUrl", e.target.value)}
                      placeholder="https://example.com/send?phone={phone}&message={message}"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sms.apiKey">API 키</Label>
                    <Input
                      id="sms.apiKey"
                      type="password"
                      value={values["sms.apiKey"] ?? ""}
                      onChange={(e) => setField("sms.apiKey", e.target.value)}
                      placeholder="(선택)"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}