"use client";

import { Fragment, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Filter, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ROLE_LABELS, ROLE_BADGE } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

const ACTION_LABELS: Record<string, { label: string; variant: string }> = {
  CREATE: { label: "생성", variant: "bg-emerald-100 text-emerald-800" },
  UPDATE: { label: "수정", variant: "bg-amber-100 text-amber-800" },
  DELETE: { label: "삭제", variant: "bg-red-100 text-red-800" },
  VIEW: { label: "조회", variant: "bg-slate-100 text-slate-700" },
  EXPORT: { label: "내보내기", variant: "bg-blue-100 text-blue-800" },
  APPROVE: { label: "승인", variant: "bg-violet-100 text-violet-800" },
  REJECT: { label: "반려", variant: "bg-orange-100 text-orange-800" },
};

const TABLE_NAMES = ["User", "Client", "Product", "Contract", "Dispatch", "Vehicle", "Driver", "Guide", "Schedule", "Settlement", "Accounting", "DispatchRule", "Notification", "AuditLog"];

type LogRow = {
  id: string;
  userId: string;
  userName: string | null;
  userRole: string | null;
  action: string;
  tableName: string;
  recordId: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: string;
};

const PAGE = 50;

export default function AuditLogsPage() {
  const [action, setAction] = useState("");
  const [table, setTable] = useState("");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({ action: "", table: "", q: "" });
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["audit-logs", applied, offset],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (applied.action) p.set("action", applied.action);
      if (applied.table) p.set("table", applied.table);
      if (applied.q) p.set("q", applied.q);
      p.set("limit", String(PAGE));
      p.set("offset", String(offset));
      const res = await fetch(`/api/audit-logs?${p.toString()}`, { cache: "no-store" });
      if (res.status === 403) throw new Error("권한이 없습니다.");
      if (!res.ok) throw new Error("감사 로그를 불러오지 못했습니다.");
      return res.json();
    },
  });

  useEffect(() => {
    if (isLoading) return;
    if (data?.total === undefined) {
      toast.error("감사 로그를 불러오지 못했습니다.");
    }
  }, [isLoading, data]);

  const apply = () => {
    setOffset(0);
    setApplied({ action, table, q });
  };

  const rows: LogRow[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">감사 로그</h2>
          <p className="text-sm text-muted-foreground">시스템 내 주요 변경·조회·내보내기 이력을 확인합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          새로고침
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="flt-action">작업</Label>
            <Select value={action} onChange={(e) => setAction(e.target.value)} id="flt-action">
              <option value="">전체</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} ({k})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="flt-table">테이블</Label>
            <Select value={table} onChange={(e) => setTable(e.target.value)} id="flt-table">
              <option value="">전체</option>
              {TABLE_NAMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-[220px] flex-1 space-y-1">
            <Label htmlFor="flt-q">이름 / 설명 / 레코드 검색</Label>
            <Input
              id="flt-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="예: admin, 계약 수정, c-0001"
              onKeyDown={(e) => e.key === "Enter" && apply()}
            />
          </div>
          <Button size="sm" onClick={apply}>
            <Filter className="h-4 w-4" /> 검색
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중...
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          조건에 맞는 감사 로그가 없습니다.
        </p>
      ) : (
        <>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">시간</th>
                    <th className="px-4 py-3 font-medium">사용자</th>
                    <th className="px-4 py-3 font-medium">작업</th>
                    <th className="px-4 py-3 font-medium">테이블</th>
                    <th className="px-4 py-3 font-medium">내용</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => {
                    const act = ACTION_LABELS[r.action] ?? { label: r.action, variant: "bg-slate-100 text-slate-700" };
                    const open = openId === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          key={r.id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => setOpenId(open ? null : r.id)}
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{r.userName || "시스템"}</div>
                            {r.userRole && (
                              <Badge className={ROLE_BADGE[r.userRole as keyof typeof ROLE_BADGE] ?? ""}>
                                {ROLE_LABELS[r.userRole as keyof typeof ROLE_LABELS] ?? r.userRole}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={act.variant}>{act.label}</Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{r.tableName}</td>
                          <td className="max-w-[280px] truncate px-4 py-3">{r.description ?? ""}</td>
                          <td className="px-4 py-3">
                            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </td>
                        </tr>
                        {open && (
                          <tr key={`${r.id}-detail`} className="bg-muted/30">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="space-y-3 text-xs">
                                {r.recordId && (
                                  <div>
                                    <span className="font-semibold text-muted-foreground">레코드: </span>
                                    <code className="font-mono">{r.recordId}</code>
                                  </div>
                                )}
                                <div className="grid gap-3 md:grid-cols-2">
                                  {(r.oldValue || r.newValue) && (
                                    <>
                                      <div className="rounded-lg border bg-background p-3">
                                        <div className="mb-1 font-semibold text-muted-foreground">변경 전</div>
                                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono">{r.oldValue ?? "-"}</pre>
                                      </div>
                                      <div className="rounded-lg border bg-background p-3">
                                        <div className="mb-1 font-semibold text-muted-foreground">변경 후</div>
                                        <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono">{r.newValue ?? "-"}</pre>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}</Fragment>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              전체 {total.toLocaleString("ko-KR")}건
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE))}>
                이전
              </Button>
              <Button variant="outline" size="sm" disabled={offset + PAGE >= total} onClick={() => setOffset((o) => o + PAGE)}>
                다음
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}