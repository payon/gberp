"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BusFront,
  CalendarClock,
  Wallet,
  FileText,
  Car,
  Users,
  Package,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OpsAlertsWidget } from "@/components/ops-alerts-widget";
import { formatWon, formatDateTime } from "@/lib/utils";
import {
  DISPATCH_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  CLIENT_TYPE_LABELS,
  statusVariant,
} from "@/lib/resources";

const CARD_ICONS: Record<string, any> = {
  todayDispatch: BusFront,
  pendingDispatch: CalendarClock,
  inProgress: TrendingUp,
  pendingSettlement: Wallet,
  activeContracts: FileText,
  pendingContracts: FileText,
  monthRevenue: TrendingUp,
};

const COUNT_ICONS: Record<string, any> = {
  totalClients: Users,
  totalProducts: Package,
  totalVehicles: Car,
  totalDrivers: Users,
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("통계 로드 실패");
      return res.json();
    },
  });

  if (error) {
    toast.error("대시보드 데이터를 불러오지 못했습니다.");
  }

  const name = (session?.user as any)?.name ?? "사용자";
  const role = (session?.user as any)?.role ?? "";

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        대시보드를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {name}님, 안녕하세요.
        </h2>
        <p className="text-muted-foreground">오늘의 업무 현황입니다.</p>
      </div>

      <OpsAlertsWidget />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.cards.map((c: any) => {
          const Icon = CARD_ICONS[c.key] ?? TrendingUp;
          return (
            <Card key={c.key}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <p className="text-xl font-bold">
                      {c.money ? formatWon(c.value) : (c.value ?? 0).toLocaleString("ko-KR")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>최근 배차</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/dispatches">전체 보기</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentDispatches.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">배차 내역이 없습니다.</p>
            ) : (
              <div className="divide-y">
                {data.recentDispatches.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-medium">{d.product}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(d.date)} · {d.driver} · {d.plate}
                      </div>
                    </div>
                    <Badge variant={statusVariant(d.status) as any}>
                      {DISPATCH_STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">시스템 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(data.counts).map(([key, value]) => {
                  const Icon = COUNT_ICONS[key] ?? Users;
                  const labels: Record<string, string> = {
                    totalClients: "고객",
                    totalProducts: "상품",
                    totalVehicles: "차량",
                    totalDrivers: "기사",
                    pendingSettlements: "정산 대기",
                    dispatchRules: "배차 규칙",
                  };
                  return (
                    <div key={key} className="rounded-lg border p-3">
                      <Icon className="mb-1.5 h-4 w-4 text-muted-foreground" />
                      <div className="text-lg font-bold">{(value as number)?.toLocaleString("ko-KR")}</div>
                      <div className="text-xs text-muted-foreground">{labels[key] ?? key}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">고객 유형 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.clientTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">데이터 없음</p>
                ) : (
                  data.clientTypes.map((c: any) => (
                    <div key={c.type} className="flex items-center justify-between text-sm">
                      <span>{CLIENT_TYPE_LABELS[c.type] ?? c.type}</span>
                      <Badge variant="secondary">{c.count}건</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>최근 계약</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/contracts">전체 보기</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentContracts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">계약 내역이 없습니다.</p>
          ) : (
            <div className="divide-y">
              {data.recentContracts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{c.client}</div>
                    <div className="text-xs text-muted-foreground">{c.number}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatWon(c.amount)}</span>
                    <Badge variant={statusVariant(c.status) as any}>
                      {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}