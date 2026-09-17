import type { UserRole } from "@prisma/client";
import { prisma } from "./prisma";
import { formatDate, formatWon } from "./utils";
import { ROLE_LABELS } from "./permissions";
import { getSettings, isHoliday, formatYmd, setting } from "./settings";

export type FieldType =
  | "text"
  | "password"
  | "number"
  | "date"
  | "datetime"
  | "select"
  | "textarea"
  | "email"
  | "tel"
  | "stops";

export type Option = { value: string; label: string };

export type Stop = { stopName: string; stopTime: string; note: string };

export function parseStops(raw: string | null | undefined): Stop[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr
        .filter((s) => s && typeof s === "object")
        .map((s) => ({
          stopName: String(s.stopName ?? s.name ?? "").trim(),
          stopTime: String(s.stopTime ?? "").trim(),
          note: String(s.note ?? "").trim(),
        }));
    }
  } catch {
    // ignore
  }
  return [];
}

export function parseWarnings(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
  } catch {
    // ignore
  }
  return [String(raw)];
}

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options?: Option[];
  optionsRoute?: string;
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  createOnly?: boolean;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type ResourceDef = {
  key: string;
  model: string;
  title: string;
  description: string;
  roles: UserRole[];
  listColumns: { key: string; label: string }[];
  searchKeys: string[];
  fields: FieldDef[];
  serialize: (row: any) => Record<string, any>;
  optionLabel?: (row: any) => string;
  transformInput?: (data: Record<string, any>, existing?: any) => Record<string, any>;
  beforeCreate?: (data: Record<string, any>, user: { id: string; name?: string | null; role?: UserRole }) => Promise<Record<string, any>>;
  beforeUpdate?: (id: string, data: Record<string, any>, user: { id: string; name?: string | null; role?: UserRole }) => Promise<Record<string, any>>;
  include?: any;
  orderBy?: any;
};

// ----------------------------------------------------------------
// 라벨 맵
// ----------------------------------------------------------------
export const CLIENT_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "개인",
  PUBLIC: "관공서",
  SCHOOL: "학교",
  CORPORATION: "기업",
};
export const CLIENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  BLACKLIST: "블랙리스트",
};
export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  PACKAGE_TOUR: "패키지 여행",
  GROUP_TOUR: "단체 관광",
  COMMUTE_BUS: "관공서/학교 출퇴근",
  CHARTER_BUS: "기업 전세",
};
export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "판매중",
  INACTIVE: "중지",
  DRAFT: "초안",
};
export const SCHEDULE_STATUS_LABELS: Record<string, string> = {
  PLANNED: "계획",
  CONFIRMED: "확정",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};
export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  MINIBUS: "미니버스(11~15인)",
  MIDBUS: "중형버스(25인)",
  LARGE_BUS: "대형버스(45인)",
  LIMOUSINE: "리무진(7~9인)",
};
export const VEHICLE_OWNERSHIP_LABELS: Record<string, string> = {
  OWN: "자차",
  EXTERNAL: "외주",
};
export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "운행가능",
  MAINTENANCE: "정비중",
  RETIRED: "폐차",
};
export const DRIVER_LICENSE_LABELS: Record<string, string> = {
  LARGE: "1종 대형",
  LARGE_SPECIAL: "1종 대형특수",
  TRAILER: "1종 견인",
};
export const DRIVER_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "출근 가능",
  ON_DUTY: "운행 중",
  REST: "휴식 중",
  LEAVE: "휴가",
  RETIRED: "퇴사",
};
export const GUIDE_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "투어 가능",
  ON_TOUR: "투어 중",
  REST: "휴식 중",
  LEAVE: "휴가",
  RETIRED: "퇴사",
};
export const DISPATCH_STATUS_LABELS: Record<string, string> = {
  PENDING: "대기",
  CONFIRMED: "확정",
  IN_PROGRESS: "운행중",
  COMPLETED: "완료",
  CANCELLED: "취소",
  FAILED: "실패",
};
export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "초안",
  PENDING: "승인대기",
  APPROVED: "승인",
  ACTIVE: "진행중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};
export const ENTRY_TYPE_LABELS: Record<string, string> = {
  SALES: "매출",
  EXPENSE: "비용",
  RECEIVABLE: "채권",
  PAYABLE: "채무",
  DEPOSIT: "예치금",
  WITHDRAWAL: "출금",
};
export const ACCOUNTING_STATUS_LABELS: Record<string, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  COMPLETED: "완료",
  EXPORTED: "더존전송",
  FAILED: "실패",
};
export const SETTLEMENT_TYPE_LABELS: Record<string, string> = {
  DRIVER: "기사",
  GUIDE: "가이드",
  EXTERNAL_COMPANY: "외주업체",
};
export const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "대기",
  CALCULATED: "계산완료",
  APPROVED: "승인",
  PAID: "지급완료",
  CANCELLED: "취소",
};
export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "활성",
  INACTIVE: "비활성",
  SUSPENDED: "정지",
};

function statusBadge(status: string): string {
  switch (status) {
    case "ACTIVE":
    case "CONFIRMED":
    case "COMPLETED":
    case "APPROVED":
    case "PAID":
    case "EXPORTED":
      return "ok";
    case "IN_PROGRESS":
    case "ON_DUTY":
    case "ON_TOUR":
    case "CALCULATED":
      return "info";
    case "PENDING":
    case "PLANNED":
    case "DRAFT":
      return "pending";
    case "CANCELLED":
    case "FAILED":
    case "SUSPENDED":
    case "BLACKLIST":
      return "bad";
    case "INACTIVE":
    case "RETIRED":
    case "LEAVE":
    case "REST":
    case "MAINTENANCE":
      return "muted";
    default:
      return "muted";
  }
}

export function statusVariant(status: string | null | undefined): string {
  switch (statusBadge(status ?? "")) {
    case "ok":
      return "success";
    case "info":
      return "info";
    case "pending":
      return "warning";
    case "bad":
      return "destructive";
    default:
      return "secondary";
  }
}

export function enumOptions(map: Record<string, string>): Option[] {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}

export function clientName(r: any): string {
  if (!r) return "-";
  return r.personalName || r.officialName || r.documentName || "-";
}

export function driverName(r: any): string {
  if (!r) return "-";
  return r.user?.name || r.userName || "-";
}

export function guideName(r: any): string {
  if (!r) return "-";
  return r.user?.name || r.userName || "-";
}

function appendWarning(data: any, msg: string | null | undefined) {
  if (!msg) return;
  const list = parseWarnings(data.warnings);
  if (!list.includes(msg)) list.push(msg);
  data.warnings = JSON.stringify(list);
}

async function holidayWarningFor(scheduledStart: any): Promise<string | null> {
  if (!scheduledStart) return null;
  const settings = await getSettings();
  const ymd = formatYmd(scheduledStart);
  const h = isHoliday(settings, ymd);
  if (!h.holiday) return null;
  return `휴일 배차 안내: ${ymd}${h.name ? ` (${h.name})` : ""}은(는) 휴일입니다. 운행 필요 여부를 확인해주세요.`;
}

export async function restHoursWarningFor(
  driverId: string | null | undefined,
  scheduledStart: any
): Promise<string | null> {
  if (!driverId || !scheduledStart) return null;
  const settings = await getSettings();
  const restHours = Number(setting(settings, "dispatch.defaultRestHours"));
  if (!(restHours > 0)) return null;

  const startDt = new Date(scheduledStart);
  const prev = await prisma.dispatch.findFirst({
    where: {
      driverId,
      deletedAt: null,
      status: { notIn: ["CANCELLED", "FAILED"] },
      scheduledEnd: { lte: startDt },
    },
    orderBy: { scheduledEnd: "desc" },
  });
  if (!prev?.scheduledEnd) return null;

  const gapMs = startDt.getTime() - new Date(prev.scheduledEnd).getTime();
  if (gapMs >= restHours * 3600_000) return null;

  const gapHours = Math.max(0, Math.floor(gapMs / 3600_000));
  return `휴게 시간 부족: 이전 배차 종료 후 ${gapHours}시간만 경과한 상태에서 출발하는 배차입니다 (기준 ${restHours}시간). 운행 일정을 확인해주세요.`;
}

// ----------------------------------------------------------------
// 리소스 정의
// ----------------------------------------------------------------
export const RESOURCE_DEFS: Record<string, ResourceDef> = {
  clients: {
    key: "clients",
    model: "client",
    title: "고객/거래처 관리",
    description: "관공서, 학교, 기업, 개인 고객 정보 관리",
    roles: ["SUPER_ADMIN", "ADMIN", "SALES"],
    listColumns: [
      { key: "name", label: "고객명" },
      { key: "clientTypeLabel", label: "유형" },
      { key: "bizNumber", label: "사업자번호" },
      { key: "contactName", label: "담당자" },
      { key: "contactPhone", label: "연락처" },
      { key: "salesManagerName", label: "담당 영업" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["name", "bizNumber", "contactPhone", "officialName", "personalName"],
    include: { salesManager: true },
    orderBy: { updatedAt: "desc" },
    fields: [
      { key: "clientType", label: "고객 유형", type: "select", required: true, options: enumOptions(CLIENT_TYPE_LABELS) },
      { key: "personalName", label: "개인 고객명", type: "text" },
      { key: "officialName", label: "공식 명칭(계약용)", type: "text" },
      { key: "documentName", label: "공문용 명칭", type: "text", help: "관공서 제출 문서에 사용되는 명칭" },
      { key: "bizNumber", label: "사업자번호", type: "text", placeholder: "000-00-00000" },
      { key: "ceoName", label: "대표자명", type: "text" },
      { key: "contactName", label: "담당자명", type: "text" },
      { key: "contactPhone", label: "담당자 연락처", type: "tel" },
      { key: "contactEmail", label: "담당자 이메일", type: "email" },
      { key: "address", label: "주소", type: "text", full: true },
      { key: "salesManagerId", label: "담당 영업사원", type: "select", optionsRoute: "users" },
      { key: "status", label: "상태", type: "select", options: enumOptions(CLIENT_STATUS_LABELS) },
      { key: "notes", label: "비고", type: "textarea", full: true },
    ],
    serialize: (r: any) => ({
      id: r.id,
      name: clientName(r),
      clientType: r.clientType,
      clientTypeLabel: CLIENT_TYPE_LABELS[r.clientType] ?? r.clientType,
      personalName: r.personalName ?? "",
      officialName: r.officialName ?? "",
      documentName: r.documentName ?? "",
      bizNumber: r.bizNumber ?? "",
      ceoName: r.ceoName ?? "",
      contactName: r.contactName ?? "",
      contactPhone: r.contactPhone ?? "",
      contactEmail: r.contactEmail ?? "",
      address: r.address ?? "",
      salesManagerId: r.salesManagerId ?? "",
      salesManagerName: r.salesManager?.name ?? "-",
      creditLimit: r.creditLimit ?? "",
      currentBalance: r.currentBalance ?? 0,
      status: r.status,
      statusLabel: CLIENT_STATUS_LABELS[r.status] ?? r.status,
      statusVariant: statusVariant(r.status),
      organizationType: r.organizationType ?? "",
      notes: r.notes ?? "",
      createdAt: formatDate(r.createdAt),
    }),
    optionLabel: (r: any) => `${clientName(r)}${r.bizNumber ? ` (${r.bizNumber})` : ""}`,
  },

  products: {
    key: "products",
    model: "travelProduct",
    title: "여행상품 관리",
    description: "패키지/단체/출퇴근/전세 상품 정보 관리",
    roles: ["SUPER_ADMIN", "ADMIN", "SALES", "OPERATOR"],
    listColumns: [
      { key: "productName", label: "상품명" },
      { key: "productCode", label: "상품코드" },
      { key: "productTypeLabel", label: "유형" },
      { key: "basePrice", label: "기본요금" },
      { key: "region", label: "지역" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["productName", "productCode"],
    orderBy: { updatedAt: "desc" },
    fields: [
      { key: "productName", label: "상품명", type: "text", required: true },
      { key: "productCode", label: "상품코드", type: "text", required: true, placeholder: "P-1001" },
      { key: "productType", label: "상품 유형", type: "select", required: true, options: enumOptions(PRODUCT_TYPE_LABELS) },
      { key: "basePrice", label: "기본 요금(원)", type: "number", required: true, min: 0 },
      { key: "status", label: "상태", type: "select", options: enumOptions(PRODUCT_STATUS_LABELS) },
      { key: "duration", label: "소요시간(시간)", type: "number" },
      { key: "minParticipants", label: "최소 인원", type: "number" },
      { key: "maxParticipants", label: "최대 인원", type: "number" },
      { key: "region", label: "지역", type: "text" },
      { key: "description", label: "상품 설명", type: "textarea", full: true },
    ],
    serialize: (r: any) => ({
      id: r.id,
      productName: r.productName,
      productCode: r.productCode,
      productType: r.productType,
      productTypeLabel: PRODUCT_TYPE_LABELS[r.productType] ?? r.productType,
      basePrice: r.basePrice,
      basePriceFormatted: formatWon(r.basePrice),
      status: r.status,
      statusLabel: PRODUCT_STATUS_LABELS[r.status] ?? r.status,
      statusVariant: statusVariant(r.status),
      duration: r.duration ?? "",
      minParticipants: r.minParticipants ?? "",
      maxParticipants: r.maxParticipants ?? "",
      region: r.region ?? "",
      description: r.description ?? "",
      createdAt: formatDate(r.createdAt),
    }),
    optionLabel: (r: any) => `${r.productName} (${r.productCode})`,
  },

  schedules: {
    key: "schedules",
    model: "schedule",
    title: "일정 관리",
    description: "예약 일정 및 실행 계획 관리",
    roles: ["SUPER_ADMIN", "ADMIN", "SALES", "OPERATOR"],
    include: { product: true, client: true, contract: true, dispatches: true },
    orderBy: { startDate: "desc" },
    listColumns: [
      { key: "productName", label: "상품" },
      { key: "clientName", label: "고객" },
      { key: "period", label: "기간" },
      { key: "participants", label: "인원" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["productName", "clientName", "departureLocation", "arrivalLocation"],
    fields: [
      { key: "productId", label: "상품", type: "select", optionsRoute: "products", required: true },
      { key: "clientId", label: "고객", type: "select", optionsRoute: "clients" },
      { key: "contractId", label: "계약", type: "select", optionsRoute: "contracts" },
      { key: "startDate", label: "시작일", type: "date", required: true },
      { key: "endDate", label: "종료일", type: "date", required: true },
      { key: "totalDays", label: "총 일수", type: "number", min: 1 },
      { key: "startTime", label: "시작 시간", type: "text", placeholder: "07:30" },
      { key: "endTime", label: "종료 시간", type: "text", placeholder: "18:30" },
      { key: "departureLocation", label: "출발지", type: "text" },
      { key: "arrivalLocation", label: "도착지", type: "text" },
      { key: "participants", label: "전체 인원", type: "number", min: 0 },
      { key: "adultCount", label: "성인", type: "number", min: 0 },
      { key: "childCount", label: "어린이", type: "number", min: 0 },
      { key: "status", label: "상태", type: "select", options: enumOptions(SCHEDULE_STATUS_LABELS) },
      { key: "specialRequest", label: "특이사항", type: "textarea", full: true },
      { key: "remark", label: "비고", type: "textarea", full: true },
    ],
    serialize: (r: any) => {
      const sd = r.startDate ? formatDate(r.startDate) : "-";
      const ed = r.endDate ? formatDate(r.endDate) : "-";
      return {
        id: r.id,
        productId: r.productId,
        productName: r.product?.productName ?? "-",
        clientId: r.clientId ?? "",
        clientName: r.client ? clientName(r.client) : "-",
        contractId: r.contractId ?? "",
        startDate: r.startDate,
        endDate: r.endDate,
        period: sd === ed ? sd : `${sd} ~ ${ed}`,
        totalDays: r.totalDays,
        startTime: r.startTime ?? "",
        endTime: r.endTime ?? "",
        departureLocation: r.departureLocation ?? "",
        arrivalLocation: r.arrivalLocation ?? "",
        participants: r.participants,
        adultCount: r.adultCount,
        childCount: r.childCount,
        status: r.status,
        statusLabel: SCHEDULE_STATUS_LABELS[r.status] ?? r.status,
        statusVariant: statusVariant(r.status),
        dispatchCount: r.dispatches?.length ?? 0,
        specialRequest: r.specialRequest ?? "",
        remark: r.remark ?? "",
      };
    },
    optionLabel: (r: any) =>
      `${r.product?.productName ?? "상품없음"} / ${formatDate(r.startDate)} ${r.client ? clientName(r.client) : ""}`,
  },

  contracts: {
    key: "contracts",
    model: "contract",
    title: "견적/계약 관리",
    description: "계약 생성, 계약금/잔금 관리",
    roles: ["SUPER_ADMIN", "ADMIN", "SALES", "OPERATOR"],
    include: { product: true, client: true },
    orderBy: { contractDate: "desc" },
    listColumns: [
      { key: "contractNumber", label: "계약번호" },
      { key: "clientName", label: "고객" },
      { key: "productName", label: "상품" },
      { key: "period", label: "기간" },
      { key: "totalAmountFormatted", label: "총액" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["contractNumber", "clientName", "productName"],
    fields: [
      { key: "contractNumber", label: "계약번호", type: "text", required: true, placeholder: "C-2026-0001" },
      { key: "clientId", label: "고객", type: "select", optionsRoute: "clients", required: true },
      { key: "productId", label: "상품", type: "select", optionsRoute: "products", required: true },
      { key: "contractDate", label: "계약일", type: "date" },
      { key: "startDate", label: "시작일", type: "date", required: true },
      { key: "endDate", label: "종료일", type: "date", required: true },
      { key: "totalAmount", label: "계약 총액(원)", type: "number", required: true, min: 0 },
      { key: "depositAmount", label: "계약금(원)", type: "number", min: 0 },
      { key: "depositPaid", label: "계약금 납부액", type: "number", min: 0 },
      { key: "balancePaid", label: "잔금 납부액", type: "number", min: 0 },
      { key: "quotedBy", label: "영업사원", type: "select", optionsRoute: "users" },
      { key: "status", label: "상태", type: "select", options: enumOptions(CONTRACT_STATUS_LABELS) },
      { key: "items", label: "항목내역(JSON)", type: "textarea", full: true, help: '[{"name":"항목명","amount":10000}]' },
      { key: "notes", label: "비고", type: "textarea", full: true },
    ],
    transformInput: (data: any) => {
      if (data.items && typeof data.items === "string") {
        try {
          JSON.parse(data.items);
        } catch {
          data.items = null;
        }
      }
      return data;
    },
    serialize: (r: any) => ({
      id: r.id,
      contractNumber: r.contractNumber,
      clientId: r.clientId,
      clientName: r.client ? clientName(r.client) : "-",
      productId: r.productId,
      productName: r.product?.productName ?? "-",
      contractDate: r.contractDate,
      startDate: r.startDate,
      endDate: r.endDate,
      period: `${formatDate(r.startDate)} ~ ${formatDate(r.endDate)}`,
      totalAmount: r.totalAmount,
      totalAmountFormatted: formatWon(r.totalAmount),
      depositAmount: r.depositAmount ?? "",
      depositPaid: r.depositPaid,
      balancePaid: r.balancePaid,
      balanceFormatted: formatWon(r.depositPaid + r.balancePaid),
      quotedBy: r.quotedBy ?? "",
      items: r.items ?? "",
      status: r.status,
      statusLabel: CONTRACT_STATUS_LABELS[r.status] ?? r.status,
      statusVariant: statusVariant(r.status),
      notes: r.notes ?? "",
      createdAt: formatDate(r.createdAt),
    }),
    optionLabel: (r: any) => `${r.contractNumber} ${r.client ? "· " + clientName(r.client) : ""}`,
  },

  vehicles: {
    key: "vehicles",
    model: "vehicle",
    title: "차량 관리",
    description: "자차/외주 차량 정보 관리",
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR"],
    orderBy: { updatedAt: "desc" },
    listColumns: [
      { key: "plateNumber", label: "차량번호" },
      { key: "vehicleTypeLabel", label: "차종" },
      { key: "seats", label: "좌석" },
      { key: "ownershipLabel", label: "소유" },
      { key: "externalCompany", label: "외주업체" },
      { key: "insuranceExpiryFormatted", label: "보험만료" },
      { key: "inspectionExpiryFormatted", label: "검사만료" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["plateNumber", "externalCompany"],
    fields: [
      { key: "plateNumber", label: "차량번호", type: "text", required: true, placeholder: "12가3456" },
      { key: "vehicleType", label: "차종", type: "select", required: true, options: enumOptions(VEHICLE_TYPE_LABELS) },
      { key: "seats", label: "좌석 수", type: "number", required: true, min: 1, max: 60 },
      { key: "ownership", label: "소유 구분", type: "select", options: enumOptions(VEHICLE_OWNERSHIP_LABELS) },
      { key: "externalCompany", label: "외주 업체명", type: "text" },
      { key: "externalCost", label: "외주 비용(원/일)", type: "number", min: 0 },
      { key: "maxDailyHours", label: "일일 최대 운행시간", type: "number", min: 0 },
      { key: "insuranceExpiry", label: "보험 만료일", type: "date" },
      { key: "inspectionExpiry", label: "정기 검사 만료일", type: "date" },
      { key: "status", label: "상태", type: "select", options: enumOptions(VEHICLE_STATUS_LABELS) },
      { key: "notes", label: "비고", type: "textarea", full: true },
    ],
    serialize: (r: any) => ({
      id: r.id,
      plateNumber: r.plateNumber,
      vehicleType: r.vehicleType,
      vehicleTypeLabel: VEHICLE_TYPE_LABELS[r.vehicleType] ?? r.vehicleType,
      seats: r.seats,
      ownership: r.ownership,
      ownershipLabel: VEHICLE_OWNERSHIP_LABELS[r.ownership] ?? r.ownership,
      externalCompany: r.externalCompany ?? "",
      externalCost: r.externalCost ?? "",
      externalCostFormatted: r.externalCost ? formatWon(r.externalCost) : "-",
      maxDailyHours: r.maxDailyHours ?? "",
      insuranceExpiry: r.insuranceExpiry,
      insuranceExpiryFormatted: r.insuranceExpiry ? formatDate(r.insuranceExpiry) : "",
      insuranceExpired: r.insuranceExpiry ? r.insuranceExpiry.getTime() < Date.now() : false,
      inspectionExpiry: r.inspectionExpiry,
      inspectionExpiryFormatted: r.inspectionExpiry ? formatDate(r.inspectionExpiry) : "",
      inspectionExpired: r.inspectionExpiry ? r.inspectionExpiry.getTime() < Date.now() : false,
      status: r.status,
      statusLabel: VEHICLE_STATUS_LABELS[r.status] ?? r.status,
      statusVariant: statusVariant(r.status),
      notes: r.notes ?? "",
      createdAt: formatDate(r.createdAt),
    }),
    optionLabel: (r: any) => `${r.plateNumber} (${VEHICLE_TYPE_LABELS[r.vehicleType] ?? r.vehicleType} ${r.seats}인)`,
  },

  drivers: {
    key: "drivers",
    model: "driver",
    title: "기사 관리",
    description: "기사 프로필, 면허, 근무조건 관리",
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR"],
    include: { user: true },
    orderBy: { user: { name: "asc" } as any },
    listColumns: [
      { key: "name", label: "기사명" },
      { key: "phone", label: "연락처" },
      { key: "licenseTypeLabel", label: "면허" },
      { key: "licenseExpiryFormatted", label: "면허만료" },
      { key: "availableRegion", label: "활동지역" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["name", "phone", "licenseNumber", "availableRegion"],
    fields: [
      { key: "name", label: "기사명", type: "text", required: true },
      { key: "phone", label: "연락처", type: "tel", required: true },
      { key: "email", label: "로그인 이메일", type: "email", help: "비워두면 자동 생성됩니다" },
      { key: "licenseNumber", label: "운전면허 번호", type: "text", required: true },
      { key: "licenseType", label: "면허 종류", type: "select", required: true, options: enumOptions(DRIVER_LICENSE_LABELS) },
      { key: "licenseExpiry", label: "면허 만료일", type: "date", required: true },
      { key: "availableRegion", label: "활동 지역", type: "text" },
      { key: "status", label: "상태", type: "select", options: enumOptions(DRIVER_STATUS_LABELS) },
      { key: "overtimeAllowed", label: "야근 허용", type: "select", options: [{ value: "true", label: "허용" }, { value: "false", label: "비허용" }] },
      { key: "maxDailyHours", label: "일일 최대 근무시간", type: "number", min: 0 },
      { key: "isExternal", label: "외주 여부", type: "select", options: [{ value: "true", label: "외주" }, { value: "false", label: "자사" }] },
      { key: "externalCompany", label: "소속 외주업체", type: "text" },
      { key: "rating", label: "평점(1~5)", type: "number", min: 0, max: 5, step: 0.1 },
      { key: "preferredRoutes", label: "선호 노선(JSON)", type: "textarea", full: true },
      { key: "excludedRoutes", label: "제외 노선(JSON)", type: "textarea", full: true },
    ],
    transformInput: (data: any) => {
      data.overtimeAllowed = data.overtimeAllowed === "true" ? true : data.overtimeAllowed === "false" ? false : Boolean(data.overtimeAllowed);
      data.isExternal = data.isExternal === "true" ? true : data.isExternal === "false" ? false : Boolean(data.isExternal);
      return data;
    },
    beforeCreate: async (data: any) => {
      const name = data.name;
      const phone = data.phone;
      const email =
        data.email || `driver-${Date.now()}@globe.com`;
      let user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        const crypto = (await import("crypto")).default;
        const hash = crypto.createHash("sha256").update(String(Date.now())).digest("hex").slice(0, 8);
        user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash: "$2b$10$" + "x".repeat(53),
            name,
            phone,
            role: "DRIVER",
            status: "ACTIVE",
          },
        });
      }
      delete data.name;
      delete data.phone;
      delete data.email;
      data.userId = user.id;
      return data;
    },
    serialize: (r: any) => ({
      id: r.id,
      name: driverName(r),
      phone: r.user?.phone ?? "",
      email: r.user?.email ?? "",
      licenseNumber: r.licenseNumber,
      licenseType: r.licenseType,
      licenseTypeLabel: DRIVER_LICENSE_LABELS[r.licenseType] ?? r.licenseType,
      licenseExpiry: r.licenseExpiry,
      licenseExpiryFormatted: formatDate(r.licenseExpiry),
      availableRegion: r.availableRegion ?? "",
      status: r.status,
      statusLabel: DRIVER_STATUS_LABELS[r.status] ?? r.status,
      statusVariant: statusVariant(r.status),
      overtimeAllowed: String(r.overtimeAllowed),
      maxDailyHours: r.maxDailyHours ?? "",
      isExternal: String(r.isExternal),
      externalCompany: r.externalCompany ?? "",
      rating: r.rating ?? "",
      preferredRoutes: r.preferredRoutes ?? "",
      excludedRoutes: r.excludedRoutes ?? "",
    }),
    optionLabel: (r: any) => `${driverName(r)} (${DRIVER_LICENSE_LABELS[r.licenseType] ?? ""})`,
  },

  guides: {
    key: "guides",
    model: "guide",
    title: "가이드 관리",
    description: "가이드 자격·언어·전문분야 관리",
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR"],
    include: { user: true },
    orderBy: { user: { name: "asc" } as any },
    listColumns: [
      { key: "name", label: "가이드명" },
      { key: "phone", label: "연락처" },
      { key: "languagesLabel", label: "언어" },
      { key: "specializationsLabel", label: "전문분야" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["name", "phone", "licenseNumber"],
    fields: [
      { key: "name", label: "가이드명", type: "text", required: true },
      { key: "phone", label: "연락처", type: "tel", required: true },
      { key: "email", label: "로그인 이메일", type: "email", help: "비워두면 자동 생성됩니다" },
      { key: "licenseNumber", label: "가이드 자격번호", type: "text" },
      { key: "languages", label: "가능 언어(JSON)", type: "text", placeholder: '["한국어","중국어"]' },
      { key: "specializations", label: "전문 분야(JSON)", type: "text", placeholder: '["수학여행"]' },
      { key: "availableRegion", label: "활동 지역", type: "text" },
      { key: "status", label: "상태", type: "select", options: enumOptions(GUIDE_STATUS_LABELS) },
      { key: "rating", label: "평점(1~5)", type: "number", min: 0, max: 5, step: 0.1 },
    ],
    beforeCreate: async (data: any) => {
      const name = data.name;
      const phone = data.phone;
      const email = data.email || `guide-${Date.now()}@globe.com`;
      let user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash: "$2b$10$" + "x".repeat(53),
            name,
            phone,
            role: "GUIDE",
            status: "ACTIVE",
          },
        });
      }
      delete data.name;
      delete data.phone;
      delete data.email;
      data.userId = user.id;
      return data;
    },
    serialize: (r: any) => {
      let languages: string[] = [];
      let specials: string[] = [];
      try { languages = r.languages ? JSON.parse(r.languages) : []; } catch { languages = [r.languages ?? ""]; }
      try { specials = r.specializations ? JSON.parse(r.specializations) : []; } catch { specials = [r.specializations ?? ""]; }
      return {
        id: r.id,
        name: guideName(r),
        phone: r.user?.phone ?? "",
        email: r.user?.email ?? "",
        licenseNumber: r.licenseNumber ?? "",
        languages: r.languages ?? "",
        languagesLabel: languages.filter(Boolean).join(", ") || "-",
        specializations: r.specializations ?? "",
        specializationsLabel: specials.filter(Boolean).join(", ") || "-",
        availableRegion: r.availableRegion ?? "",
        status: r.status,
        statusLabel: GUIDE_STATUS_LABELS[r.status] ?? r.status,
        statusVariant: statusVariant(r.status),
        rating: r.rating ?? "",
      };
    },
    optionLabel: (r: any) => `${guideName(r)}${r.languages ? " · " + r.languages : ""}`,
  },

  dispatches: {
    key: "dispatches",
    model: "dispatch",
    title: "배차 관리",
    description: "일정에 기사/차량을 배정하고 중복 배차를 방지합니다",
    roles: ["SUPER_ADMIN", "ADMIN", "OPERATOR", "SALES"],
    include: { schedule: { include: { product: true, client: true } }, vehicle: true, driver: { include: { user: true } }, guide: { include: { user: true } } },
    orderBy: { scheduledStart: "desc" },
    listColumns: [
      { key: "period", label: "배차 일시" },
      { key: "scheduleName", label: "일정" },
      { key: "driverName", label: "기사" },
      { key: "plateNumber", label: "차량" },
      { key: "guideName", label: "가이드" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["scheduleName", "driverName", "plateNumber", "departureLocation", "arrivalLocation"],
    fields: [
      { key: "scheduleId", label: "일정", type: "select", optionsRoute: "schedules", required: true },
      { key: "vehicleId", label: "차량", type: "select", optionsRoute: "vehicles", required: true },
      { key: "driverId", label: "기사", type: "select", optionsRoute: "drivers", required: true },
      { key: "guideId", label: "가이드", type: "select", optionsRoute: "guides" },
      { key: "scheduledStart", label: "예정 출발", type: "datetime", required: true },
      { key: "scheduledEnd", label: "예정 도착", type: "datetime", required: true },
      { key: "departureLocation", label: "출발지", type: "text" },
      { key: "arrivalLocation", label: "도착지", type: "text" },
      { key: "route", label: "정차 경로(버스 정차)", type: "stops", full: true, help: "출발지에서 도착지까지 승객을 태우는 중간 정차 장소를 순서대로 등록합니다." },
      { key: "status", label: "상태", type: "select", options: enumOptions(DISPATCH_STATUS_LABELS) },
      { key: "specialConditions", label: "특별조건(JSON)", type: "textarea", full: true },
      { key: "notes", label: "비고", type: "textarea", full: true },
    ],
    transformInput: (data: any) => {
      if (data.guideId === "") data.guideId = null;
      if (data.specialConditions && typeof data.specialConditions === "string" && data.specialConditions.trim()) {
        try { JSON.parse(data.specialConditions); } catch { data.specialConditions = null; }
      }
      if (data.route && typeof data.route === "string" && data.route.trim()) {
        const stops = parseStops(data.route);
        data.route = stops.length > 0 ? JSON.stringify(stops) : null;
      } else {
        data.route = null;
      }
      return data;
    },
    beforeCreate: async (data: any) => {
      const start = new Date(data.scheduledStart);
      const end = new Date(data.scheduledEnd);
      const otherDateStart = new Date(start);
      otherDateStart.setHours(0, 0, 0, 0);
      const otherDateEnd = new Date(start);
      otherDateEnd.setHours(23, 59, 59, 999);
      const conflict = await prisma.dispatch.findFirst({
        where: {
          driverId: data.driverId,
          deletedAt: null,
          status: { notIn: ["CANCELLED", "FAILED"] },
          scheduledStart: { lte: otherDateEnd },
          scheduledEnd: { gte: otherDateStart },
        },
      });
      if (conflict) {
        throw new ConflictError("해당 기사는 같은 시간대에 다른 배차가 이미 확정되어 있습니다.");
      }
      appendWarning(data, await holidayWarningFor(data.scheduledStart));
      appendWarning(data, await restHoursWarningFor(data.driverId, data.scheduledStart));
      return data;
    },
    beforeUpdate: async (id: string, data: any) => {
      if (data.driverId && data.scheduledStart && data.scheduledEnd) {
        const start = new Date(data.scheduledStart);
        const end = new Date(data.scheduledEnd);
        const otherDateStart = new Date(start);
        otherDateStart.setHours(0, 0, 0, 0);
        const otherDateEnd = new Date(start);
        otherDateEnd.setHours(23, 59, 59, 999);
        const conflict = await prisma.dispatch.findFirst({
          where: {
            driverId: data.driverId,
            deletedAt: null,
            id: { not: id },
            status: { notIn: ["CANCELLED", "FAILED"] },
            scheduledStart: { lte: otherDateEnd },
            scheduledEnd: { gte: otherDateStart },
          },
        });
        if (conflict) {
          throw new ConflictError("해당 기사는 같은 시간대에 다른 배차가 이미 확정되어 있습니다.");
        }
      }
      const existing = await prisma.dispatch.findUnique({
        where: { id },
        select: { warnings: true, scheduledStart: true, driverId: true },
      });
      const warnings = parseWarnings(existing?.warnings);
      const warning = await holidayWarningFor(data.scheduledStart ?? existing?.scheduledStart);
      if (warning && !warnings.includes(warning)) warnings.push(warning);
      const restWarning = await restHoursWarningFor(
        data.driverId ?? existing?.driverId,
        data.scheduledStart ?? existing?.scheduledStart
      );
      if (restWarning && !warnings.includes(restWarning)) warnings.push(restWarning);
      data.warnings = JSON.stringify(warnings);
      return data;
    },
    serialize: (r: any) => ({
      id: r.id,
      scheduleId: r.scheduleId,
      scheduleName: r.schedule
        ? `${r.schedule.product?.productName ?? "상품"} / ${r.schedule.client ? clientName(r.schedule.client) : ""} / ${formatDate(r.schedule.startDate)}`
        : "-",
      vehicleId: r.vehicleId,
      plateNumber: r.vehicle?.plateNumber ?? "-",
      vehicleLabel: r.vehicle ? `${r.vehicle.plateNumber} ${VEHICLE_TYPE_LABELS[r.vehicle.vehicleType] ?? ""}` : "-",
      driverId: r.driverId,
      driverName: driverName(r.driver) ,
      guideId: r.guideId ?? "",
      guideName: r.guide ? guideName(r.guide) : "-",
      scheduledStart: r.scheduledStart,
      scheduledEnd: r.scheduledEnd,
      period: `${formatDate(r.scheduledStart)} ${r.scheduledStart ? new Date(r.scheduledStart).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : ""}`,
      departureLocation: r.departureLocation ?? "",
      arrivalLocation: r.arrivalLocation ?? "",
      route: r.route ?? "",
      stops: parseStops(r.route),
      warningsList: parseWarnings(r.warnings),
      status: r.status,
      statusLabel: DISPATCH_STATUS_LABELS[r.status] ?? r.status,
      statusVariant: statusVariant(r.status),
      recommendationScore: r.recommendationScore ?? "",
      autoRecommended: r.autoRecommended,
      specialConditions: r.specialConditions ?? "",
      notes: r.notes ?? "",
      warnings: r.warnings ?? "",
    }),
    optionLabel: (r: any) => `${formatDate(r.scheduledStart)} ${r.driver ? driverName(r.driver) : ""} / ${r.vehicle?.plateNumber ?? ""}`,
  },

  accounting: {
    key: "accounting",
    model: "accountingEntry",
    title: "회계 관리",
    description: "표준 분개 구조로 매출/비용을 관리하고 더존 연동을 준비합니다",
    roles: ["SUPER_ADMIN", "ADMIN"],
    orderBy: { entryDate: "desc" },
    listColumns: [
      { key: "entryNumber", label: "분개번호" },
      { key: "entryDateFormatted", label: "분개일" },
      { key: "entryTypeLabel", label: "구분" },
      { key: "accountName", label: "계정명" },
      { key: "debitFormatted", label: "차변" },
      { key: "creditFormatted", label: "대변" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["entryNumber", "accountName", "accountCode", "description"],
    fields: [
      { key: "entryDate", label: "분개일", type: "date", required: true },
      { key: "entryType", label: "거래 구분", type: "select", required: true, options: enumOptions(ENTRY_TYPE_LABELS) },
      { key: "accountCode", label: "계정 코드", type: "text", required: true, placeholder: "401" },
      { key: "accountName", label: "계정명", type: "text", required: true, placeholder: "관공서 수송매출" },
      { key: "subAccountCode", label: "부계정 코드", type: "text" },
      { key: "debit", label: "차변 금액(원)", type: "number", min: 0 },
      { key: "credit", label: "대변 금액(원)", type: "number", min: 0 },
      { key: "description", label: "거래 내용", type: "text", required: true },
      { key: "referenceNumber", label: "참조 번호", type: "text" },
      { key: "contractId", label: "계약", type: "select", optionsRoute: "contracts" },
      { key: "dzExportReady", label: "더존 전송 대기", type: "select", options: [{ value: "true", label: "준비됨" }, { value: "false", label: "아니오" }] },
      { key: "status", label: "상태", type: "select", options: enumOptions(ACCOUNTING_STATUS_LABELS) },
    ],
    transformInput: (data: any) => {
      data.dzExportReady = data.dzExportReady === "true" ? true : data.dzExportReady === "false" ? false : Boolean(data.dzExportReady);
      return data;
    },
    beforeCreate: async (data: any) => {
      const today = new Date();
      const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
      const count = await prisma.accountingEntry.count({
        where: { entryNumber: { startsWith: `AE-${ymd}` } },
      });
      data.entryNumber = `AE-${ymd}-${String(count + 1).padStart(3, "0")}`;
      return data;
    },
    serialize: (r: any) => ({
      id: r.id,
      entryNumber: r.entryNumber,
      entryDate: r.entryDate,
      entryDateFormatted: formatDate(r.entryDate),
      entryType: r.entryType,
      entryTypeLabel: ENTRY_TYPE_LABELS[r.entryType] ?? r.entryType,
      accountCode: r.accountCode,
      accountName: r.accountName,
      subAccountCode: r.subAccountCode ?? "",
      debit: r.debit,
      debitFormatted: formatWon(r.debit),
      credit: r.credit,
      creditFormatted: formatWon(r.credit),
      description: r.description,
      referenceNumber: r.referenceNumber ?? "",
      contractId: r.contractId ?? "",
      dzExportReady: String(r.dzExportReady),
      status: r.status,
      statusLabel: ACCOUNTING_STATUS_LABELS[r.status] ?? r.status,
      statusVariant: statusVariant(r.status),
      createdAt: formatDate(r.createdAt),
    }),
    optionLabel: (r: any) => `${r.entryNumber} ${r.description ?? ""}`,
  },

  settlements: {
    key: "settlements",
    model: "settlement",
    title: "정산 관리",
    description: "기사/가이드/외주 정산 처리",
    roles: ["SUPER_ADMIN", "ADMIN"],
    orderBy: { createdAt: "desc" },
    listColumns: [
      { key: "settlementNumber", label: "정산번호" },
      { key: "settlementTypeLabel", label: "대상" },
      { key: "targetName", label: "대상자" },
      { key: "period", label: "정산기간" },
      { key: "totalAmountFormatted", label: "총액" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["settlementNumber", "targetName"],
    fields: [
      { key: "settlementType", label: "정산 대상 유형", type: "select", required: true, options: enumOptions(SETTLEMENT_TYPE_LABELS) },
      { key: "targetName", label: "대상자/업체명", type: "text", required: true },
      { key: "settlementDate", label: "정산 시작일", type: "date", required: true },
      { key: "settlementEndDate", label: "정산 종료일", type: "date", required: true },
      { key: "baseAmount", label: "기본 금액(원)", type: "number", min: 0 },
      { key: "overtimeAmount", label: "야근 수당(원)", type: "number", min: 0 },
      { key: "bonusAmount", label: "상여금(원)", type: "number", min: 0 },
      { key: "deductionAmount", label: "공제액(원)", type: "number", min: 0 },
      { key: "totalAmount", label: "최종 지급액(원)", type: "number", min: 0, help: "비워두면 자동 계산됩니다" },
      { key: "paidAt", label: "지급일", type: "date" },
      { key: "paymentMethod", label: "지급 방법", type: "text" },
      { key: "status", label: "상태", type: "select", options: enumOptions(SETTLEMENT_STATUS_LABELS) },
      { key: "notes", label: "비고", type: "textarea", full: true },
    ],
    beforeCreate: async (data: any) => {
      const today = new Date();
      const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
      const count = await prisma.settlement.count({
        where: { settlementNumber: { startsWith: `S-${ymd}` } },
      });
      data.settlementNumber = `S-${ymd}-${String(count + 1).padStart(3, "0")}`;
      if (!data.totalAmount || data.totalAmount === 0) {
        data.totalAmount = (data.baseAmount || 0) + (data.overtimeAmount || 0) + (data.bonusAmount || 0) - (data.deductionAmount || 0);
      }
      return data;
    },
    serialize: (r: any) => ({
      id: r.id,
      settlementNumber: r.settlementNumber,
      settlementDate: r.settlementDate,
      settlementEndDate: r.settlementEndDate,
      period: `${formatDate(r.settlementDate)} ~ ${formatDate(r.settlementEndDate)}`,
      settlementType: r.settlementType,
      settlementTypeLabel: SETTLEMENT_TYPE_LABELS[r.settlementType] ?? r.settlementType,
      targetName: r.targetName,
      baseAmount: r.baseAmount,
      overtimeAmount: r.overtimeAmount,
      bonusAmount: r.bonusAmount,
      deductionAmount: r.deductionAmount,
      totalAmount: r.totalAmount,
      totalAmountFormatted: formatWon(r.totalAmount),
      paidAt: r.paidAt ?? "",
      paymentMethod: r.paymentMethod ?? "",
      status: r.status,
      statusLabel: SETTLEMENT_STATUS_LABELS[r.status] ?? r.status,
      statusVariant: statusVariant(r.status),
      notes: r.notes ?? "",
      createdAt: formatDate(r.createdAt),
    }),
    optionLabel: (r: any) => `${r.settlementNumber} ${r.targetName ?? ""}`,
  },

  users: {
    key: "users",
    model: "user",
    title: "사용자/권한 관리",
    description: "사용자 생성 및 역할(Role) 기반 권한 관리",
    roles: ["SUPER_ADMIN", "ADMIN"],
    orderBy: { createdAt: "desc" },
    listColumns: [
      { key: "name", label: "이름" },
      { key: "email", label: "이메일" },
      { key: "phone", label: "연락처" },
      { key: "roleLabel", label: "역할" },
      { key: "department", label: "부서" },
      { key: "statusLabel", label: "상태" },
    ],
    searchKeys: ["name", "email", "phone", "employeeCode", "department"],
    fields: [
      { key: "email", label: "이메일", type: "email", required: true },
      { key: "password", label: "비밀번호", type: "password", required: true, createOnly: true, help: "최초 생성 시에만 설정" },
      { key: "name", label: "이름", type: "text", required: true },
      { key: "phone", label: "연락처", type: "tel", required: true },
      { key: "role", label: "역할", type: "select", required: true, options: enumOptions(ROLE_LABELS) },
      { key: "status", label: "상태", type: "select", options: enumOptions(USER_STATUS_LABELS) },
      { key: "department", label: "부서", type: "text" },
      { key: "employeeCode", label: "사원번호", type: "text" },
    ],
    beforeCreate: async (data: any) => {
      const hash = (await import("bcryptjs")).default;
      data.passwordHash = hash.hashSync(data.password || "admin1234", 10);
      delete data.password;
      data.email = String(data.email).toLowerCase().trim();
      return data;
    },
    beforeUpdate: async (id: string, data: any) => {
      delete data.password;
      if (data.email) data.email = String(data.email).toLowerCase().trim();
      return data;
    },
    serialize: (r: any) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      phone: r.phone,
      role: r.role,
      roleLabel: ROLE_LABELS[r.role] ?? r.role,
      status: r.status,
      statusLabel: USER_STATUS_LABELS[r.status] ?? r.status,
      statusVariant: statusVariant(r.status),
      department: r.department ?? "",
      employeeCode: r.employeeCode ?? "",
      createdAt: formatDate(r.createdAt),
    }),
    optionLabel: (r: any) => `${r.name} (${ROLE_LABELS[r.role] ?? r.role})`,
  },
};

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// 클라이언트로 전달 가능한 직렬화 형태의 메타데이터
export function toResourceMeta(def: ResourceDef) {
  return {
    key: def.key,
    title: def.title,
    description: def.description,
    roles: def.roles,
    listColumns: def.listColumns,
    searchKeys: def.searchKeys,
    fields: def.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      options: f.options ?? undefined,
      optionsRoute: f.optionsRoute,
      required: f.required ?? false,
      placeholder: f.placeholder,
      help: f.help,
      full: f.full ?? false,
      createOnly: f.createOnly ?? false,
      min: f.min,
      max: f.max,
      step: f.step,
    })),
  };
}

export type ResourceMeta = ReturnType<typeof toResourceMeta>;