"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Package, Car, IdCard, Wallet, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatWon, formatDateTime } from "@/lib/utils";
import { DISPATCH_STATUS_LABELS, CONTRACT_STATUS_LABELS, CLIENT_TYPE_LABELS, statusVariant } from "@/lib/resources";

const itemDefs = [
  { key: "totalClients", label: "총 고객", icon: Users },
  { key: "totalProducts", label: "총 상품", icon: Package },
  { key: "totalVehicles", label: "총 차량", icon: Car },
  { key: "totalDrivers", label: "총 기사", icon: IdCard },
  { key: "dispatchRules", label: "배차 규칙(활성)", icon: ShieldCheck },
  { key: "pendingSettlements", label: "정산 대기", icon: Wallet },
];

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("통계 로드 실패");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        리포트를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">통계 / 리포트</h2>
        <p className="text-muted-foreground">전사 핵심 지표와 최근 활동 요약입니다.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itemDefs.map((item) => {
          const Icon = item.icon;
          const value = (data.counts as any)[item.key] ?? 0;
          return (
            <Card key={item.key}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold">{value.toLocaleString("ko-KR")}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>고객 유형 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.clientTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">데이터 없음</p>
              ) : (
                data.clientTypes.map((c: any) => (
                  <div key={c.type}>
                    <div className="flex justify-between text-sm">
                      <span>{CLIENT_TYPE_LABELS[c.type] ?? c.type}</span>
                      <span className="font-medium">{c.count.toLocaleString("ko-KR")}건</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${Math.round(
                            (c.count / Math.max(1, data.clientTypes.reduce((a: number, b: any) => a + b.count, 0))) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 배차 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.recentDispatches.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">배차 이력이 없습니다.</p>
              ) : (
                data.recentDispatches.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.product}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(d.date)} · {d.driver} · {d.plate}
                      </div>
                    </div>
                    <Badge variant={statusVariant(d.status) as any}>
                      {DISPATCH_STATUS_LABELS[d.status] ?? d.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>최근 계약 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.recentContracts.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">계약 내역이 없습니다.</p>
              ) : (
                data.recentContracts.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="font-medium">{c.client}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.number} · {formatDateTime(c.date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatWon(c.amount)}</span>
                      <Badge variant={statusVariant(c.status) as any}>
                        {CONTRACT_STATUS_LABELS[c.status] ?? c.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}