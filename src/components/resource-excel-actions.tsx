"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExcelImportButton } from "@/components/excel-import-button";

export function ResourceExcelActions({ resource }: { resource: string }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/exports/${resource}`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "다운로드 실패");
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename="(.+?)"/);
      const name = m ? m[1] : `${resource}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? "엑셀 다운로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.print()}
        aria-label="리스트 인쇄"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">인쇄</span>
      </Button>
      <Button variant="outline" size="sm" onClick={download} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        <span className="hidden sm:inline">엑셀</span>
      </Button>
      <ExcelImportButton resource={resource} />
    </div>
  );
}