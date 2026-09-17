"use client";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const RATE_KEY = "gb:tts-rate";

export function readTtsRate(): number {
  if (typeof window === "undefined") return 0.95;
  try {
    const raw = Number(localStorage.getItem(RATE_KEY));
    if (!Number.isFinite(raw)) return 0.95;
    return Math.min(1.3, Math.max(0.7, raw));
  } catch {
    return 0.95;
  }
}

export function writeTtsRate(rate: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RATE_KEY, String(Math.min(1.3, Math.max(0.7, rate))));
  } catch {}
}

export function getKoreanVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const ko =
    voices.find((v) => /ko[-_]KR/i.test(v.lang)) ||
    voices.find((v) => /^ko\b/i.test(v.lang)) ||
    voices.find((v) => v.name && /korean/i.test(v.name));
  return ko ?? null;
}

let loaded = false;
export function primeVoices() {
  if (loaded || !isSpeechSupported()) return;
  getKoreanVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    getKoreanVoice();
  };
  loaded = true;
}

export function speak(text: string, opts?: { rate?: number; pitch?: number; volume?: number }) {
  if (!isSpeechSupported()) return false;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ko-KR";
  const voice = getKoreanVoice();
  if (voice) utter.voice = voice;
  utter.rate = opts?.rate ?? 0.95;
  utter.pitch = opts?.pitch ?? 1;
  utter.volume = opts?.volume ?? 1;
  window.speechSynthesis.speak(utter);
  return true;
}

export function stopSpeaking() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

export function speakQueued(
  texts: string[],
  opts?: { rate?: number; pitch?: number }
) {
  if (!isSpeechSupported() || texts.length === 0) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = getKoreanVoice();
  for (const t of texts) {
    const utter = new SpeechSynthesisUtterance(t);
    utter.lang = "ko-KR";
    if (voice) utter.voice = voice;
    utter.rate = opts?.rate ?? 0.95;
    utter.pitch = opts?.pitch ?? 1;
    synth.speak(utter);
  }
  return true;
}