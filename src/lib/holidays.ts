export type HolidayRow = { date: string; name: string };

export function parseHolidayList(raw: string | null | undefined): HolidayRow[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr
        .filter((h) => h && typeof h.date === "string")
        .map((h) => ({ date: String(h.date).trim(), name: String(h.name ?? "").trim() }));
    }
  } catch {
    // ignore
  }
  return [];
}

export function normalizeHolidays(rows: HolidayRow[]): HolidayRow[] {
  const seen = new Set<string>();
  const out: HolidayRow[] = [];
  for (const row of rows) {
    const date = String(row.date ?? "").trim();
    const name = String(row.name ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || seen.has(date)) continue;
    seen.add(date);
    out.push({ date, name });
  }
  return out;
}

export function validateHolidays(rows: HolidayRow[]): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    const date = String(row.date ?? "").trim();
    const name = String(row.name ?? "").trim();
    if (!date || !name) return "휴일의 날짜와 이름을 모두 입력해주세요.";
    if (seen.has(date)) return `${date} 날짜가 중복되었습니다.`;
    if (isNaN(new Date(`${date}T00:00:00`).getTime())) return `${date} 은(는) 올바른 날짜가 아닙니다.`;
    seen.add(date);
  }
  return null;
}