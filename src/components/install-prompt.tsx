"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed || !deferred) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 rounded-xl border bg-card p-3 shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-80">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Download className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">앱으로 설치하기</p>
            <p className="text-xs text-muted-foreground">홈 화면에서 바로 실행하세요</p>
          </div>
        </div>
        <button
          className="text-muted-foreground"
          onClick={() => setDismissed(true)}
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Button
        className="mt-2 w-full"
        size="lg"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        설치하기
      </Button>
    </div>
  );
}