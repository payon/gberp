"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { speak, stopSpeaking, isSpeechSupported } from "@/lib/tts";
import { Volume2, VolumeX } from "lucide-react";

export function TtsButton({
  text,
  rate = 0.95,
  size = "lg",
  className,
}: {
  text: string;
  rate?: number;
  size?: "lg" | "xl";
  className?: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && isSpeechSupported();

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const toggle = useCallback(() => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const ok = speak(text, { rate });
    if (!ok) return;
    setSpeaking(true);
    const duration = Math.min(60, text.length / 5 + 4) * 1000;
    const timer = window.setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        window.clearInterval(timer);
        setSpeaking(false);
      }
    }, 1000);
    window.setTimeout(() => {
      window.clearInterval(timer);
      setSpeaking(false);
    }, duration + 2000);
  }, [text, rate, speaking]);

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border bg-muted/50 text-sm font-semibold text-muted-foreground",
          size === "xl" ? "h-16 px-6 text-lg" : "h-11 px-4",
          className
        )}
      >
        <VolumeX className="h-5 w-5" />
        이 기기에서 음성 미지원
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="음성 안내"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border-2 font-bold transition active:scale-95",
        speaking
          ? "border-destructive bg-destructive text-destructive-foreground"
          : "border-primary bg-primary text-primary-foreground",
        size === "xl" ? "h-16 px-6 text-lg" : "h-11 px-4",
        className
      )}
    >
      <Volume2 className={cn("h-5 w-5", speaking && "animate-pulse")} />
      {speaking ? "음성 중지" : "음성 안내 듣기"}
    </button>
  );
}