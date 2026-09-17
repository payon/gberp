import type { Settings } from "./settings";

export type FeatureKey =
  | "semiAutoDispatch"
  | "runLog"
  | "vehicleExpiry"
  | "autoSettlement"
  | "excelImport"
  | "dashboardAlert"
  | "smsNotify";

export type FeatureDef = {
  key: FeatureKey;
  label: string;
  description: string;
  default: boolean;
};

export const FEATURE_DEFS: FeatureDef[] = [
  {
    key: "semiAutoDispatch",
    label: "반자동 배차 (추천)",
    description: "일정에 맞는 기사·차량을 점수 기반으로 추천하고, 운영자가 선택해 배차를 생성합니다.",
    default: true,
  },
  {
    key: "runLog",
    label: "운행일지 (기사앱)",
    description: "기사가 운행 종료 시 주행거리와 특이사항을 기록합니다.",
    default: false,
  },
  {
    key: "vehicleExpiry",
    label: "차량 만료 관리",
    description: "차량 보험·검사 만료일을 등록/표시하고 대시보드 운영 알림에 반영합니다.",
    default: false,
  },
  {
    key: "autoSettlement",
    label: "배차→정산 자동 초안",
    description: "운행이 종료된 배차를 모아 기사/가이드 정산 초안(PENDING)을 자동 생성합니다.",
    default: false,
  },
  {
    key: "excelImport",
    label: "엑셀 일괄 등록",
    description: "목록 화면에서 엑셀 파일로 여러 건을 한 번에 등록합니다. (템플릿 = 엑셀 내보내기 형식)",
    default: false,
  },
  {
    key: "dashboardAlert",
    label: "대시보드 운영 알림",
    description: "면허·보험·검사 만료 임박과 계약 승인·정산 대기 건을 대시보드에 표시합니다.",
    default: false,
  },
  {
    key: "smsNotify",
    label: "SMS 자동 발송",
    description: "배차가 생성되면 기사·가이드에게 문자를 발송합니다 (설정의 SMS 게이트웨이 URL 필요).",
    default: false,
  },
];

export function featureSettingKey(key: FeatureKey): string {
  return `features.${key}`;
}

export function featureDefault(key: FeatureKey): boolean {
  return FEATURE_DEFS.find((d) => d.key === key)?.default ?? false;
}

export function featureEnabled(settings: Settings, key: FeatureKey): boolean {
  const raw = settings[featureSettingKey(key)] ?? String(featureDefault(key));
  return raw === "true";
}

export function enabledFeatures(settings: Settings): Record<FeatureKey, boolean> {
  const out = {} as Record<FeatureKey, boolean>;
  for (const def of FEATURE_DEFS) out[def.key] = featureEnabled(settings, def.key);
  return out;
}