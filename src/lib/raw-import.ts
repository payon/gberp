import { inflateRawSync } from "zlib";
import * as XLSX from "xlsx";

export type ParsedRow = { sheet: string; index: number; data: Record<string, any> };

export function detectFileType(ext: string): "EXCEL" | "HWP" | "PDF" {
  if (ext === ".pdf") return "PDF";
  if (ext === ".hwp" || ext === ".hwpx") return "HWP";
  return "EXCEL";
}

export function parseExcel(buf: Buffer): ParsedRow[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const rows: ParsedRow[] = [];
  for (const wsName of wb.SheetNames) {
    const sheet = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[wsName], { defval: "", raw: true });
    sheet.forEach((row, i) => {
      rows.push({ sheet: wsName, index: i + 2, data: row });
    });
  }
  return rows;
}

function readZipEntries(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let off = 0;
  while (off + 30 <= buf.length) {
    const sig = buf.readUInt32LE(off);
    if (sig === 0x02014b50 || sig === 0x06054b50) break;
    if (sig !== 0x04034b50) break;
    const method = buf.readUInt16LE(off + 8);
    const compSize = buf.readUInt32LE(off + 18);
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const name = buf.subarray(off + 30, off + 30 + nameLen).toString("utf8");
    const dataStart = off + 30 + nameLen + extraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    try {
      out.set(name, method === 8 ? inflateRawSync(comp) : Buffer.from(comp));
    } catch {
      // ignore corrupt entry
    }
    off = dataStart + compSize;
  }
  return out;
}

export function parseHwpx(buf: Buffer): ParsedRow[] {
  const entries = readZipEntries(buf);
  const sections = [...entries.keys()]
    .filter((n) => /^Contents\/section\d+\.xml$/i.test(n))
    .sort();
  if (sections.length === 0) throw new Error("HWPX 본문(section)을 찾을 수 없습니다.");
  const rows: ParsedRow[] = [];
  let idx = 1;
  for (const name of sections) {
    const xml = entries.get(name)!.toString("utf8");
    const paras = xml.split(/<\/w:p[^>]*>/i);
    for (const p of paras) {
      const texts = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/gi)].map((m) => m[1].trim()).filter(Boolean);
      if (texts.length === 0) continue;
      rows.push({ sheet: name, index: idx++, data: { text: texts.join(" ") } });
    }
  }
  return rows;
}
