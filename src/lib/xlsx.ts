import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { formatYmd } from "./settings";

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function safeFileName(name: string): string {
  return name.replace(/[^\w가-힣()-]/g, "_").slice(0, 80);
}

export function textCell(v: unknown): string {
  const s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

export function xlsxDownload(wb: XLSX.WorkBook, baseName: string): NextResponse {
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const headers = new Headers();
  headers.set(
    "Content-Disposition",
    `attachment; filename="${safeFileName(baseName)}-${formatYmd(new Date())}.xlsx"`
  );
  headers.set("Content-Type", XLSX_CONTENT_TYPE);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "no-store");

  return new NextResponse(buf as any, { headers });
}