"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Send, Megaphone } from "lucide-react";

const TARGETS = [
  { value: "DRIVER", label: "기사 전체" },
  { value: "GUIDE", label: "가이드 전체" },
  { value: "STAFF", label: "사무실 직원 (관리자/영업/운영)" },
  { value: "ALL", label: "모든 사용자" },
];

export function NotificationComposer() {
  const [target, setTarget] = useState("DRIVER");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok?: string; error?: string } | null>(null);

  const send = async () => {
    if (!title.trim()) {
      setResult({ error: "제목을 입력해주세요." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      if (target === "ALL" || target === "STAFF") {
        const roles = target === "ALL" ? ["DRIVER", "GUIDE"] : ["ADMIN", "SALES", "OPERATOR"];
        let ok = 0;
        let failed = 0;
        let removed = 0;
        for (const role of roles) {
          const res = await fetch("/api/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim(), message: message.trim(), role }),
          });
          const json = await res.json();
          ok += json.ok ?? 0;
          failed += json.failed ?? 0;
          removed += json.removed ?? 0;
        }
        setResult({
          ok: `발송 완료 (성공 ${ok}건, 실패 ${failed}건${removed ? `, 유효하지 않음 제거 ${removed}건` : ""})`,
        });
      } else {
        const role = target;
        const res = await fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), message: message.trim(), role }),
        });
        const json = await res.json();
        if (res.ok) {
          setResult({
            ok: `발송 완료 (성공 ${json.ok}건, 실패 ${json.failed}건${
              json.removed ? `, 유효하지 않음 제거 ${json.removed}건` : ""
            })`,
          });
        } else {
          setResult({ error: json.error ?? "발송에 실패했습니다." });
        }
      }
    } catch {
      setResult({ error: "발송 중 오류가 발생했습니다." });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> 알림 발송
        </CardTitle>
        <CardDescription>
          기사·가이드 스마트폰(PWA/TWA 설치 후)으로 푸시 알림을 보냅니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="push-target">받는 대상</Label>
          <Select
            id="push-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full"
          >
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="push-title">제목</Label>
          <Input
            id="push-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 오늘 오후 배차 변경 안내"
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="push-message">내용</Label>
          <Textarea
            id="push-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="기사님께 전달할 내용을 입력하세요. 음성 안내는 자동으로 배차 정보를 읽습니다."
            rows={3}
            maxLength={300}
          />
        </div>

        {result?.error && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {result.error}
          </p>
        )}
        {result?.ok && (
          <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            {result.ok}
          </p>
        )}

        <Button className="w-full h-12" onClick={send} disabled={sending}>
          <Send className="h-5 w-5" />
          {sending ? "발송 중..." : "알림 보내기"}
        </Button>
      </CardContent>
    </Card>
  );
}