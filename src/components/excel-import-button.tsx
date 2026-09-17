"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExcelImportButton({ resource }: { resource: string }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { data: features } = useQuery({
    queryKey: ["features"],
    queryFn: async () => {
      const res = await fetch("/api/features", { cache: "no-store" });
      return res.json().catch(() => ({}));
    },
    staleTime: 60_000,
  });

  if (!features?.excelImport) return null;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/import/${resource}`, { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const failed = j?.data?.failed ?? [];
        throw new Error(
          failed.length
            ? `${j.error ?? "오류"} · 실패 ${failed.length}행 ${failed
                .slice(0, 3)
                .map((f: any) => `${f.row}행: ${f.error}`)
                .join(" / ")}`
            : j?.error ?? "일괄 등록 실패"
        );
      }
      const d = j.data ?? {};
      const done = d.failed.length === 0 ? ` 모두 성공` : `, 실패 ${d.failed.length}건`;
      if (d.created > 0) {
        toast.success(`엑셀 등록 완료 · ${d.created}건 생성${done}`);
      } else {
        toast.warning("등록된 행이 없습니다. 열 이름을 확인해주세요.");
      }
      queryClient.invalidateQueries({ queryKey: [resource] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (err: any) {
      toast.error(err?.message ?? "엑셀 일괄 등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={onFile}
        aria-label="엑셀 파일 선택"
      />
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        <span className="hidden sm:inline">엑셀 등록</span>
      </Button>
    </>
  );
}