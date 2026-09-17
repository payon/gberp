import { cache } from "react";
import { prisma } from "./prisma";
import { parseHolidayList } from "./holidays";

// 키목록: 클라이언트 설정 화면에서 사용하는 모든 키값의 기본값 정의
export const DEFAULT_SETTINGS: Record<string, string> = {
  // 회사 정보
  "company.name": "종합여행사",
  "company.registrationNumber": "",
  "company.ceoName": "",
  "company.phone": "",
  "company.fax": "",
  "company.email": "",
  "company.address": "",
  "company.businessType": "운수 여행업",
  "company.businessItem": "전세버스 운송사업",
  "company.logoPath": "",

  // 알림·음성 기본값
  "voice.defaultRate": "0.95",
  "voice.autoAnnounce": "true",

  // 배차 규칙
  "dispatch.defaultRestHours": "8",

  // 휴일 (JSON 배열: [{ "date": "2026-09-25", "name": "추석" }])
  "holidays.list": "[]",

  // 문서 (샘플 규격서 등)
  "document.specPath": "",
  "document.specName": "",

  // 기능 토글 (features.*)
  "features.semiAutoDispatch": "true",
  "features.runLog": "false",
  "features.vehicleExpiry": "false",
  "features.autoSettlement": "false",
  "features.excelImport": "false",
  "features.dashboardAlert": "false",
  "features.smsNotify": "false",

  // SMS 게이트웨이 (smsNotify 켜고 배차 생성 시 발송)
  "sms.gatewayUrl": "",
  "sms.apiKey": "",
};

export type Settings = Record<string, string>;

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await prisma.appSetting.findMany();
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
});

export function setting(s: Settings, key: string): string {
  return s[key] ?? DEFAULT_SETTINGS[key] ?? "";
}

export function companyName(s: Settings): string {
  return setting(s, "company.name");
}

export async function saveSettings(entries: Record<string, string>) {
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  for (const [key, value] of Object.entries(entries)) {
    if (!allowed.has(key)) continue;
    const v = String(value ?? "");
    await prisma.appSetting.upsert({
      where: { key },
      update: { value: v },
      create: { key, value: v },
    });
  }
}

export function getHolidays(settings: Settings): { date: string; name: string }[] {
  return parseHolidayList(setting(settings, "holidays.list"));
}

export function isHoliday(settings: Settings, dateStr: string): { holiday: boolean; name?: string } {
  const date = formatYmd(dateStr);
  const h = getHolidays(settings).find((x) => x.date === date);
  return h ? { holiday: true, name: h.name } : { holiday: false };
}

export function formatYmd(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}