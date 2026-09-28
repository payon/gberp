"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePush } from "@/hooks/use-push";
import { readTtsRate, writeTtsRate, speak, isSpeechSupported } from "@/lib/tts";
import { Volume2, Bell, BellRing, BellOff } from "lucide-react";

const AUTO_KEY = "gb:guide-auto-announce";

export default function GuideSettingsPage() {
  const [rate, setRate] = useState<number>((): number => readTtsRate());
  const [auto, setAuto] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { state, busy, enable, disable } = usePush();

  const changeRate = useCallback((v: number) => {
    setRate(v);
    writeTtsRate(v);
  }, []);

  const autoLabel = auto ? "켜짐" : "꺼짐";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">안내 설정</h1>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <Volume2 className="mt-1 h-6 w-6 text-primary" />
            <div className="flex-1">
              <div className="font-bold">음성 빠르기</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                배차 안내를 읽어주는 속도입니다.
              </div>
              <input
                type="range"
                min={0.7}
                max={1.3}
                step={0.05}
                value={rate}
                onChange={(e) => changeRate(Number(e.target.value))}
                className="mt-4 w-full"
                aria-label="음성 빠르기"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">느리게</span>
                <span className="text-sm font-bold">{rate.toFixed(2)}배</span>
                <span className="text-xs text-muted-foreground">빠르게</span>
              </div>
              <Button
                variant="outline"
                className="mt-3 w-full h-12"
                onClick={() => speak("이것은 음성 속도 테스트입니다. 잘 들리시나요?", { rate })}
              >
                <Volume2 className="h-5 w-5" /> 테스트 듣기
              </Button>
              {!isSpeechSupported() && (
                <p className="mt-2 text-xs text-destructive">
                  이 기기에서는 음성 합성이 지원되지 않습니다.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Volume2 className="mt-1 h-6 w-6 text-primary" />
              <div>
                <div className="font-bold">자동 음성 안내</div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  새 배차가 내려오면 자동으로 읽어드립니다.
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={auto}
              onClick={() => {
                setAuto((v) => !v);
                try {
                  localStorage.setItem(AUTO_KEY, auto ? "0" : "1");
                } catch {}
              }}
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
          <p className="text-xs text-muted-foreground">
            현재 상태: <span className="font-semibold">{autoLabel}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <Bell className="mt-1 h-6 w-6 text-primary" />
            <div>
              <div className="font-bold">푸시 알림</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                배차 안내를 화면이 꺼져 있어도 알림으로 받습니다.
              </div>
            </div>
          </div>

          {state === "unsupported" ? (
            <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
              이 기기(브라우저)에서는 푸시 알림을 지원하지 않습니다.
            </p>
          ) : state === "subscribed" ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                <BellRing className="h-5 w-5" /> 알림이 켜져 있습니다
              </p>
              <Button variant="outline" className="h-12 w-full" disabled={busy} onClick={disable}>
                <BellOff className="h-5 w-5" /> 알림 끄기
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {state === "denied" ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  알림 권한이 차단되어 있습니다. 브라우저 설정에서 권한을 허용해주세요.
                </p>
              ) : (
                <Button className="h-12 w-full" disabled={busy} onClick={enable}>
                  <Bell className="h-5 w-5" /> 알림 켜기
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
