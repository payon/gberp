import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, type SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";
import { logCreate, logUpdate, logSoftDelete } from "@/lib/audit";
import { RESOURCE_DEFS, ConflictError, type ResourceDef, type FieldDef } from "@/lib/resources";
import { notifyDispatchCreated } from "@/lib/notify";
import type { UserRole } from "@prisma/client";

const AUTH_ERROR = NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
const FORBIDDEN = NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

export async function getSessionUser(): Promise<{ user: SessionUser | null; response: NextResponse | null }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { user: null, response: AUTH_ERROR };
  }
  const user: SessionUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: (session.user.role as UserRole) ?? undefined,
  };
  return { user, response: null };
}

function canAccess(def: ResourceDef, role: UserRole | undefined): boolean {
  return hasRole(role, def.roles);
}

export function parseValue(raw: unknown, field: FieldDef): unknown {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    if (field.type === "number") {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    if (field.type === "date" || field.type === "datetime") {
      const d = new Date(raw as any);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return raw;
  }
  const s = raw.trim();
  switch (field.type) {
    case "number": {
      if (s === "") return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    case "date": {
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m - 1, d);
      }
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    case "datetime": {
      if (!s) return null;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    default:
      return s === "" ? null : s;
  }
}

export function buildData(def: ResourceDef, input: Record<string, any>): Record<string, any> {
  const data: Record<string, any> = {};
  for (const field of def.fields) {
    if (field.createOnly) continue;
    if (!(field.key in input)) continue;
    const value = parseValue(input[field.key], field);
    if (value !== null || field.key === "notes") data[field.key] = value;
  }
  return data;
}

export function validateRequired(def: ResourceDef, data: Record<string, any>): string | null {
  for (const field of def.fields) {
    if (!field.required) continue;
    if (field.createOnly) continue;
    const v = data[field.key];
    if (v === undefined || v === null || v === "") {
      return `"${field.label}"(은)는 필수 입력 항목입니다.`;
    }
  }
  return null;
}

function prismaErrorBody(e: any): { error: string; status: number } {
  if (e instanceof ConflictError) {
    return { error: e.message, status: 409 };
  }
  if (e?.code === "P2002") {
    const target = e?.meta?.target;
    const field = Array.isArray(target) ? target[0] : target;
    return { error: `중복된 값입니다. (${field ?? "unique field"})`, status: 400 };
  }
  if (e?.code === "P2003") {
    return { error: "관련 데이터가 존재하지 않습니다. 참조 값을 확인해주세요.", status: 400 };
  }
  if (e?.code === "P2025") {
    return { error: "데이터를 찾을 수 없습니다.", status: 404 };
  }
  return { error: e?.message ?? "서버 오류가 발생했습니다.", status: 500 };
}

function extractWarning(row: any): string | null {
  const w = row?.warnings;
  if (!w) return null;
  if (Array.isArray(w)) return w.filter((x) => typeof x === "string").join(", ") || null;
  try {
    const arr = JSON.parse(w);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string").join(", ") || null;
  } catch {
    // ignore
  }
  return String(w);
}

// ----------------------------------------------------------------
// GET: 목록 (또는 ?all=1 옵션)
// ----------------------------------------------------------------
export async function handleList(req: NextRequest, resource: string) {
  const def = RESOURCE_DEFS[resource];
  if (!def) return NextResponse.json({ error: "리소스를 찾을 수 없습니다." }, { status: 404 });

  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!canAccess(def, user!.role)) return FORBIDDEN;

  const isAll = req.nextUrl.searchParams.get("all") === "1";
  const model = (prisma as any)[def.model];
  const where: any = { deletedAt: null };

  const monthParam = req.nextUrl.searchParams.get("month");
  if (monthParam && resource === "dispatches" && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    where.scheduledStart = { gte: start, lt: end };
  }

  if (isAll) {
    const rows = await model.findMany({
      where,
      include: def.include,
      orderBy: def.orderBy,
      take: 500,
    });
    return NextResponse.json({
      options: rows.map((r: any) => ({
        value: r.id,
        label: def.optionLabel ? def.optionLabel(r) : r.id,
      })),
    });
  }

  const rows = await model.findMany({ where, include: def.include, orderBy: def.orderBy });
  return NextResponse.json({ data: rows.map((r: any) => def.serialize(r)) });
}

// ----------------------------------------------------------------
// POST: 생성
// ----------------------------------------------------------------
export async function handleCreate(req: NextRequest, resource: string) {
  const def = RESOURCE_DEFS[resource];
  if (!def) return NextResponse.json({ error: "리소스를 찾을 수 없습니다." }, { status: 404 });

  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!canAccess(def, user!.role)) return FORBIDDEN;

  let input: Record<string, any>;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  let data = buildData(def, input);
  const missing = validateRequired(def, data);
  if (missing) return NextResponse.json({ error: missing }, { status: 400 });

  if (def.transformInput) data = def.transformInput(data);
  if (def.beforeCreate) {
    try {
      data = await def.beforeCreate(data, user!);
    } catch (e) {
      const body = prismaErrorBody(e);
      return NextResponse.json({ error: body.error }, { status: body.status });
    }
  }

  try {
    const model = (prisma as any)[def.model];
    const created = await model.create({ data });
    await logCreate(user, def.model, created.id, created);
    if (def.model === "dispatch") {
      try {
        await notifyDispatchCreated(created);
      } catch {
        // SMS 알림 실패는 배차 생성에 영향을 주지 않음
      }
    }
    return NextResponse.json(
      { data: def.serialize(created), warning: extractWarning(created) },
      { status: 201 }
    );
  } catch (e) {
    const body = prismaErrorBody(e);
    return NextResponse.json({ error: body.error }, { status: body.status });
  }
}

// ----------------------------------------------------------------
// PATCH: 수정
// ----------------------------------------------------------------
export async function handleUpdate(req: NextRequest, resource: string, id: string) {
  const def = RESOURCE_DEFS[resource];
  if (!def) return NextResponse.json({ error: "리소스를 찾을 수 없습니다." }, { status: 404 });

  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!canAccess(def, user!.role)) return FORBIDDEN;

  let input: Record<string, any>;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  let data = buildData(def, input);
  if (def.transformInput) data = def.transformInput(data);
  if (def.beforeUpdate) {
    try {
      data = await def.beforeUpdate(id, data, user!);
    } catch (e) {
      const body = prismaErrorBody(e);
      return NextResponse.json({ error: body.error }, { status: body.status });
    }
  }

  try {
    const model = (prisma as any)[def.model];
    const existing = await model.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "데이터를 찾을 수 없습니다." }, { status: 404 });
    }
    const updated = await model.update({ where: { id }, data });
    await logUpdate(user, def.model, id, existing, updated);
    return NextResponse.json({ data: def.serialize(updated), warning: extractWarning(updated) });
  } catch (e) {
    const body = prismaErrorBody(e);
    return NextResponse.json({ error: body.error }, { status: body.status });
  }
}

// ----------------------------------------------------------------
// DELETE: 소프트 삭제
// ----------------------------------------------------------------
export async function handleDelete(req: NextRequest, resource: string, id: string) {
  const def = RESOURCE_DEFS[resource];
  if (!def) return NextResponse.json({ error: "리소스를 찾을 수 없습니다." }, { status: 404 });

  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!canAccess(def, user!.role)) return FORBIDDEN;

  try {
    const model = (prisma as any)[def.model];
    const existing = await model.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: "데이터를 찾을 수 없습니다." }, { status: 404 });
    }
    await model.update({ where: { id }, data: { deletedAt: new Date() } });
    await logSoftDelete(user, def.model, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const body = prismaErrorBody(e);
    return NextResponse.json({ error: body.error }, { status: body.status });
  }
}