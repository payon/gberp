"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePush } from "@/hooks/use-push";
import { InboxCard } from "@/components/inbox-card";
import {
  Bell,
  BellRing,
  BellOff,
  Smartphone,
  Repeat,
  Send,
} from "lucide-react";

export default function GuideNotificationsPage() {
  const { state, busy, enable, disable } = usePush();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const sendTest = async () => {
    setSending(true);
    setSent(null);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "테스트 알림",
          message: "알림이 정상적으로 도착했어요.",
          url: "/guide",
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSent(`발송 완료 (성공 ${json.ok}건${json.failed ? `, 실패 ${json.failed}건` : ""})`);
      } else {
        setSent(json.error ?? "테스트를 보낼 수 없습니다.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">알림</h1>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-1 h-6 w-6 text-primary" />
            <div>
              <div className="font-bold">배차 알림 받기</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                화면이 꺼져 있어도 음성과 함께 알림으로 새 배차를 알려드립니다.
              </div>
            </div>
          </div>

          {state === "unsupported" ? (
            <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
              이 브라우저에서는 푸시 알림을 지원하지 않습니다. 설치 앱(현재 PWA/TWA)에서는 지원됩니다.
            </p>
          ) : state === "subscribed" ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                <BellRing className="h-5 w-5" /> 알림이 켜져 있어요
              </p>
              <Button variant="outline" className="h-12 w-full" disabled={busy} onClick={disable}>
                <BellOff className="h-5 w-5" /> 알림 끄기
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {state === "denied" ? (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  알림 권한이 차단되어 있습니다. 브라우저 설정(🔒 아이콘)에서 알림을 허용해주세요.
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

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <Send className="mt-1 h-6 w-6 text-primary" />
            <div>
              <div className="font-bold">알림 테스트</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                내 휴대폰으로 테스트 알림을 보내보세요.
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-12 w-full"
            disabled={sending || state !== "subscribed"}
            onClick={sendTest}
          >
            {sending ? "전송 중..." : "🔔 테스트 알림 보내기"}
          </Button>
          {sent && (
            <p className="rounded-lg bg-muted/60 p-3 text-sm">{sent}</p>
          )}
        </CardContent>
      </Card>

      <InboxCard queryKey="guide-inbox" />

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start gap-3">
            <Repeat className="mt-1 h-6 w-6 text-primary" />
            <div>
              <div className="font-bold">자동 확인 주기</div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                새 배차는 <span className="font-semibold">1분마다</span> 자동으로 확인합니다.
                음성 안내를 켜두시면 큰 소리로 안내해 드립니다.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
