import type { Metadata } from "next";
import { NotificationComposer } from "@/components/notification-composer";
import { Card, CardContent } from "@/components/ui/card";
import { BellRing, Smartphone, Volume2 } from "lucide-react";

export const metadata: Metadata = { title: "알림 전파 · 여행사 ERP" };

export default function NotificationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">알림 전파</h1>
        <p className="text-sm text-muted-foreground">
          기사·가이드 앱으로 푸시 알림과 음성 안내를 전달합니다.
        </p>
      </div>

      <NotificationComposer />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <Smartphone className="mt-0.5 h-6 w-6 text-primary" />
            <div>
              <div className="font-bold">앱 설치 안내</div>
              <p className="mt-1 text-sm text-muted-foreground">
                크롬 주소창의 <span className="font-medium">홈 화면에 추가 · 앱 설치</span>를
                누르면 전체 화면 앱으로 실행됩니다. (Android PWA/TWA)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <BellRing className="mt-0.5 h-6 w-6 text-primary" />
            <div>
              <div className="font-bold">오프라인 알림</div>
              <p className="mt-1 text-sm text-muted-foreground">
                화면이 꺼져 있어도 서버 푸시(web-push)로 알림이 도착합니다.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <Volume2 className="mt-0.5 h-6 w-6 text-primary" />
            <div>
              <div className="font-bold">자동 음성 안내</div>
              <p className="mt-1 text-sm text-muted-foreground">
                기사가 자동 안내를 켜두면 새 배차 정보를 기기 음성으로 읽어드립니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}