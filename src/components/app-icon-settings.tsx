"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ImageIcon, Loader2, Monitor, Smartphone, Tablet, Upload } from "lucide-react";
import { APP_ICON_SIZES } from "@/lib/app-icon-meta";

type Props = {
  values: Record<string, string>;
  setField: (key: string, v: string) => void;
  onChanged: () => void;
};

const PWA_FIELDS = [
  { key: "pwa.name", label: "앱 이름", placeholder: "종합여행사 ERP" },
  { key: "pwa.shortName", label: "홈화면 짧은 이름", placeholder: "여행ERP" },
];

export function AppIconSettings({ values, setField, onChanged }: Props) {
  const [uploading, setUploading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const iconPath = values["pwa.iconPath"] ?? "";
  const appName = values["pwa.name"]?.trim() || values["company.name"]?.trim() || "종합여행사";
  const themeColor = values["pwa.themeColor"]?.trim() || "#0a0a0a";
  const bgColor = values["pwa.backgroundColor"]?.trim() || "#ffffff";

  const onUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/app-icon", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "업로드에 실패했습니다.");
        }
        const data = await res.json();
        setField("pwa.iconPath", data.data?.iconPath ?? "");
        setField("pwa.iconUpdatedAt", data.data?.updatedAt ?? "");
        setGeneratedAt(data.data?.updatedAt ?? null);
        onChanged();
        toast.success("앱 아이콘이 생성됐습니다. 상단 저장 버튼을 눌러 확정하세요.");
      } catch (e: any) {
        toast.error(e?.message || "업로드에 실패했습니다.");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [onChanged, setField]
  );

  const previewSrc = (s: number) => (iconPath ? `/icons/app-${s}.png?t=${generatedAt ?? values["pwa.iconUpdatedAt"] ?? ""}` : "");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          원본 이미지 1장을 올리면 데스크탑·모바일·태블릿 설치용 아이콘(72~512px, maskable, iOS, 파비콘)을 자동 생성합니다.
          512×512 이상 정사각형 PNG 권장, 최대 5MB.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {iconPath ? (
          <img src={iconPath} alt="앱 아이콘" className="h-24 w-24 rounded-3xl border object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl border bg-muted/40">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
          <Button variant="outline" type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "생성 중..." : "아이콘 업로드·생성"}
          </Button>
          <p className="text-xs text-muted-foreground">
            생성 즉시 매니페스트·TWA·브라우저 탭에 반영됩니다 (캐시 무효화를 위해 버전 쿼리 포함).
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PWA_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              type="text"
              value={values[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="pwa.themeColor">테마 색상</Label>
          <div className="flex items-center gap-2">
            <input
              id="pwa.themeColor"
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(themeColor) ? themeColor : "#0a0a0a"}
              onChange={(e) => setField("pwa.themeColor", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border"
            />
            <Input
              type="text"
              value={values["pwa.themeColor"] ?? ""}
              onChange={(e) => setField("pwa.themeColor", e.target.value)}
              placeholder="#0a0a0a"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pwa.backgroundColor">배경 색상(스플래시)</Label>
          <div className="flex items-center gap-2">
            <input
              id="pwa.backgroundColor"
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(bgColor) ? bgColor : "#ffffff"}
              onChange={(e) => setField("pwa.backgroundColor", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border"
            />
            <Input
              type="text"
              value={values["pwa.backgroundColor"] ?? ""}
              onChange={(e) => setField("pwa.backgroundColor", e.target.value)}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      {iconPath && (
        <div className="space-y-2">
          <div className="text-sm font-semibold">생성된 사이즈</div>
          <div className="flex flex-wrap items-end gap-3">
            {APP_ICON_SIZES.map((s) => (
              <div key={s} className="text-center">
                <img
                  src={previewSrc(s)}
                  alt={`${s}px`}
                  width={Math.min(64, Math.max(24, Math.round(s / 8)))}
                  height={Math.min(64, Math.max(24, Math.round(s / 8)))}
                  className="rounded-lg border object-cover"
                />
                <div className="mt-1 text-[11px] text-muted-foreground">{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm font-semibold">기기별 미리보기</div>
        <div className="grid gap-4 lg:grid-cols-3">
          <DeviceFrame icon={iconPath} name="모바일" width={150} header={themeColor} appName={appName} splash={bgColor} deviceIcon={<Smartphone className="h-4 w-4" />} />
          <DeviceFrame icon={iconPath} name="태블릿" width={220} header={themeColor} appName={appName} splash={bgColor} deviceIcon={<Tablet className="h-4 w-4" />} />
          <DeviceFrame icon={iconPath} name="데스크탑" width={300} header={themeColor} appName={appName} splash={bgColor} deviceIcon={<Monitor className="h-4 w-4" />} />
        </div>
      </div>

      <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">TWA(Android) 연동 안내</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            TWA 빌드 설정(<code className="rounded bg-muted px-1 text-xs">twa/twa-manifest.json</code>)의{" "}
            <code className="rounded bg-muted px-1 text-xs">iconUrl</code>은{" "}
            <code className="rounded bg-muted px-1 text-xs">https://도메인/icons/app-512.png</code>를 가리키게 하세요.
          </li>
          <li>
            Play Console 서명 지문을 <code className="rounded bg-muted px-1 text-xs">fingerprints</code>에 등록하고,
            서버 <code className="rounded bg-muted px-1 text-xs">/.well-known/assetlinks.json</code>에 동일 지문을 게시하세요.
          </li>
          <li>maskable 아이콘(<code className="rounded bg-muted px-1 text-xs">app-maskable-512.png</code>)은 적응형 아이콘용입니다.</li>
        </ul>
      </div>
    </div>
  );
}

function DeviceFrame({
  icon,
  name,
  width,
  header,
  appName,
  splash,
  deviceIcon,
}: {
  icon: string;
  name: string;
  width: number;
  header: string;
  appName: string;
  splash: string;
  deviceIcon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        {deviceIcon} {name}
      </div>
      <div className="mx-auto overflow-hidden rounded-lg border" style={{ width }}>
        <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: header }}>
          {icon ? (
            <img src={icon} alt="" className="h-5 w-5 rounded" />
          ) : (
            <div className="h-5 w-5 rounded bg-white/30" />
          )}
          <span className="truncate text-[11px] font-semibold text-white">{appName}</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-2 py-4" style={{ background: splash }}>
          {icon ? (
            <img src={icon} alt="" className="h-12 w-12 rounded-xl shadow" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <span className="text-[11px] font-medium">{appName}</span>
          <span className="text-[10px] text-muted-foreground">설치된 PWA 실행 화면</span>
        </div>
      </div>
    </div>
  );
}
