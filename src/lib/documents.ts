import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { prisma } from "./prisma";
import { formatDate } from "./utils";
import { numberToKoreanWon } from "./amount";

export type DocumentTargetType = "contract" | "dispatch" | "schedule" | "client";

const TARGET_LOADERS: Record<DocumentTargetType, (id: string) => Promise<any>> = {
  contract: (id) =>
    prisma.contract.findUnique({
      where: { id },
      include: { client: true, product: true },
    }),
  dispatch: (id) =>
    prisma.dispatch.findUnique({
      where: { id },
      include: {
        schedule: { include: { client: true, product: true } },
        vehicle: true,
        driver: { include: { user: true } },
        guide: { include: { user: true } },
      },
    }),
  schedule: (id) =>
    prisma.schedule.findUnique({
      where: { id },
      include: { client: true, product: true },
    }),
  client: (id) => prisma.client.findUnique({ where: { id } }),
};

export function resolvePath(root: any, dotted: string): any {
  if (!root || !dotted) return undefined;
  return String(dotted)
    .split(".")
    .reduce((acc: any, k: string) => (acc == null ? undefined : acc[k]), root);
}

export function transformValue(value: any, fn?: string | null, fieldType?: string | null): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatDate(value);
  const kind = fn || (fieldType === "AMOUNT" ? "koreanAmount" : fieldType === "DATE" ? "date" : "");
  if (kind === "koreanAmount") {
    const n = Number(value);
    if (Number.isFinite(n)) return `${Number(n).toLocaleString("ko-KR")}원 (${numberToKoreanWon(n)})`;
  }
  if (kind === "date") return formatDate(value as any);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export type RenderedField = { code: string; name: string; value: string; required: boolean };

export async function renderDocument(input: {
  templateId: string;
  targetType: DocumentTargetType;
  targetId: string;
  printedBy: string;
  isOfficialDoc?: boolean;
  officialDocRef?: string;
}): Promise<{ historyId: string; outputPath: string; fields: RenderedField[]; snapshot: Record<string, any> }> {
  const template = await prisma.documentTemplate.findUnique({
    where: { id: input.templateId },
    include: { fields: true },
  });
  if (!template) throw new Error("템플릿을 찾을 수 없습니다.");
  if (!template.isActive) throw new Error("사용 중지된 템플릿입니다.");

  const loader = TARGET_LOADERS[input.targetType];
  if (!loader) throw new Error("지원하지 않는 출력 대상입니다.");
  const target = await loader(input.targetId);
  if (!target || target.deletedAt) throw new Error("출력 대상을 찾을 수 없습니다.");

  const bundle: Record<string, any> = { [input.targetType]: target };
  if (input.targetType === "dispatch") {
    if (target.schedule) {
      bundle.schedule = target.schedule;
      if (target.schedule.client) bundle.client = target.schedule.client;
      if (target.schedule.product) bundle.product = target.schedule.product;
    }
    if (target.driver) bundle.driver = target.driver;
    if (target.vehicle) bundle.vehicle = target.vehicle;
    if (target.guide) bundle.guide = target.guide;
  }
  if (input.targetType === "contract") {
    if (target.client) bundle.client = target.client;
    if (target.product) bundle.product = target.product;
  }
  if (input.targetType === "schedule") {
    if (target.client) bundle.client = target.client;
    if (target.product) bundle.product = target.product;
  }

  let mapping: Record<string, string> = {};
  try {
    const parsed = JSON.parse(template.fieldMapping || "{}");
    if (parsed && typeof parsed === "object") mapping = parsed;
  } catch {
    mapping = {};
  }

  const fields: RenderedField[] = [];
  for (const f of template.fields) {
    const dotted = f.sourceTable && f.sourceField ? `${f.sourceTable}.${f.sourceField}` : mapping[f.fieldCode];
    const raw = dotted ? resolvePath(bundle, dotted) : undefined;
    if ((raw === undefined || raw === null || raw === "") && f.isRequired) {
      throw new Error(`필수 필드 "${f.fieldName}" 값을 찾을 수 없습니다.`);
    }
    fields.push({
      code: f.fieldCode,
      name: f.fieldName,
      value: transformValue(raw, f.transformFunction, f.fieldType),
      required: f.isRequired,
    });
  }
  for (const [code, dotted] of Object.entries(mapping)) {
    if (fields.some((f) => f.code === code)) continue;
    fields.push({ code, name: code, value: transformValue(resolvePath(bundle, dotted)), required: false });
  }

  const snapshot = {
    templateId: template.id,
    templateName: template.templateName,
    documentType: template.documentType,
    targetType: input.targetType,
    targetId: input.targetId,
    renderedAt: new Date().toISOString(),
    company: undefined,
    fields: fields.reduce<Record<string, string>>((acc, f) => {
      acc[f.code] = f.value;
      return acc;
    }, {}),
  };

  const history = await prisma.documentOutputHistory.create({
    data: {
      templateId: template.id,
      targetId: input.targetId,
      targetType: input.targetType,
      outputPath: "",
      outputFormat: "JSON",
      dataSnapshot: JSON.stringify(snapshot),
      printedBy: input.printedBy,
      isOfficialDoc: input.isOfficialDoc ?? false,
      officialDocRef: input.officialDocRef || null,
    },
  });

  const dir = path.join(process.cwd(), "public", "uploads", "documents");
  mkdirSync(dir, { recursive: true });
  const fileName = `${history.id}.json`;
  writeFileSync(path.join(dir, fileName), JSON.stringify(snapshot, null, 2), "utf8");
  const outputPath = `/uploads/documents/${fileName}`;
  await prisma.documentOutputHistory.update({
    where: { id: history.id },
    data: { outputPath },
  });

  return { historyId: history.id, outputPath, fields, snapshot };
}
