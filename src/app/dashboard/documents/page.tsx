"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResourceWrapper } from "@/components/resource-wrapper";
import { FileText, Printer } from "lucide-react";

type TemplateOpt = { value: string; label: string };

export default function DocumentsPage() {
  const [templateId, setTemplateId] = useState("");
  const [targetType, setTargetType] = useState("contract");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ historyId: string; outputPath: string; fields: { code: string; name: string; value: string }[] } | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["document-template-options"],
    queryFn: async () => {
      const res = await fetch("/api/document-templates?all=1");
      if (!res.ok) return { options: [] as TemplateOpt[] };
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["document-history"],
    queryFn: async () => {
      const res = await fetch("/api/documents/history?limit=20");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  const render = async () => {
    if (!templateId || !targetId.trim()) {
      toast.error("템플릿과 출력 대상 ID를 입력하세요.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/documents/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, targetType, targetId: targetId.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "문서 출력에 실패했습니다.");
      setResult(json.data);
      toast.success("문서를 출력했습니다.");
      refetchHistory();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">문서 출력</h2>
        <p className="text-sm text-muted-foreground">관공서 제출용 문서 템플릿을 관리하고 계약·배차 데이터로 출력합니다.</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 font-bold">
            <Printer className="h-5 w-5 text-primary" /> 문서 출력하기
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">템플릿</span>
              <select
                className="w-full rounded-md border bg-background px-3 py-2"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">선택하세요</option>
                {(templates?.options ?? []).map((o: TemplateOpt) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">출력 대상</span>
              <select
                className="w-full rounded-md border bg-background px-3 py-2"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
              >
                <option value="contract">계약</option>
                <option value="dispatch">배차</option>
                <option value="schedule">일정</option>
                <option value="client">고객</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">대상 ID</span>
              <Input placeholder="계약/배차 목록에서 ID 복사" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
            </label>
          </div>
          <Button onClick={render} disabled={busy}>
            <FileText className="h-4 w-4" /> {busy ? "출력 중..." : "문서 출력"}
          </Button>
          {result && (
            <div className="space-y-2 rounded-lg border p-4">
              <div className="text-sm font-semibold">출력 결과 (이력 {result.historyId})</div>
              <div className="text-xs text-muted-foreground">파일: {result.outputPath}</div>
              <dl className="grid gap-1 text-sm sm:grid-cols-2">
                {result.fields.map((f) => (
                  <div key={f.code} className="flex gap-2 rounded bg-muted/60 px-2 py-1">
                    <dt className="shrink-0 font-medium">{f.name}</dt>
                    <dd className="min-w-0 truncate">{f.value || "-"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="font-bold">최근 출력 이력</div>
          {(history?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">출력 이력이 없습니다.</p>
          ) : (
            <ul className="divide-y text-sm">
              {(history?.data ?? []).map((h: any) => (
                <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="font-medium">{h.templateName}</span>
                  <span className="text-muted-foreground">{h.targetType}/{h.targetId}</span>
                  <span className="text-muted-foreground">{h.outputPath}</span>
                  {h.isOfficialDoc && <span className="font-semibold text-primary">공문서</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-lg font-bold">템플릿 관리</h3>
        <ResourceWrapper resource="document-templates" />
      </div>
      <div>
        <h3 className="mb-2 text-lg font-bold">필드 관리</h3>
        <ResourceWrapper resource="document-fields" />
      </div>
    </div>
  );
}
