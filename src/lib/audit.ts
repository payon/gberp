import { createHash } from "crypto";
import { AuditAction, UserRole } from "@prisma/client";
import { prisma } from "./prisma";
import { redactSensitiveDeep } from "./security-policy";

type AuditInput = {
  userId?: string | null;
  userName?: string | null;
  userRole?: UserRole | null;
  action: AuditAction;
  tableName: string;
  recordId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  description?: string | null;
};

function safeJson(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  try {
    return JSON.stringify(redactSensitiveDeep(v));
  } catch {
    return null;
  }
}

function safeParse(v: string | null | undefined): unknown {
  if (v === null || v === undefined) return null;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}
function chainHash(prevHash: string, payload: string): string {
  return createHash("sha256").update(`${prevHash}|${payload}`).digest("hex");
}

function canonical(input: AuditInput, oldV: string | null, newV: string | null): string {
  return JSON.stringify([
    input.userId ?? "system",
    input.action,
    input.tableName,
    input.recordId ?? "",
    oldV ?? "",
    newV ?? "",
  ]);
}

export async function auditLog(input: AuditInput): Promise<void> {
  try {
    const oldV = safeJson(input.oldValue);
    const newV = safeJson(input.newValue);
    const last = await prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { entryHash: true } });
    const prevHash = last?.entryHash ?? "GENESIS";
    const entryHash = chainHash(prevHash, canonical(input, oldV, newV));
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? "system",
        userName: input.userName || null,
        userRole: input.userRole || null,
        action: input.action,
        tableName: input.tableName,
        recordId: input.recordId || null,
        oldValue: oldV,
        newValue: newV,
        description: input.description || null,
        prevHash,
        entryHash,
      },
    });
  } catch (e) {
    console.error("audit log write failed:", e);
  }
}

export async function verifyAuditChain(limit = 5000): Promise<{ checked: number; brokenAt: string | null }> {
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" }, take: limit });
  let prev = "GENESIS";
  let checked = 0;
  for (const r of rows) {
    if (!r.entryHash) continue;
    const oldParsed = safeParse(r.oldValue);
    const newParsed = safeParse(r.newValue);
    const payload = JSON.stringify([
      r.userId ?? "system",
      r.action,
      r.tableName,
      r.recordId ?? "",
      oldParsed === null && r.oldValue == null ? "" : JSON.stringify(redactSensitiveDeep(oldParsed)),
      newParsed === null && r.newValue == null ? "" : JSON.stringify(redactSensitiveDeep(newParsed)),
    ]);
    if (r.prevHash !== prev) return { checked, brokenAt: r.id };
    if (r.entryHash !== chainHash(prev, payload)) return { checked, brokenAt: r.id };
    prev = r.entryHash ?? prev;
    checked++;
  }
  return { checked, brokenAt: null };
}

// 소프트 삭제 형태: 수정/삭제 시 감사 로그 남김
type AuditUser = { id: string; name?: string | null; userRole?: UserRole | null; role?: UserRole | null };

function resolveRole(user: AuditUser | null | undefined): UserRole | null {
  return user?.userRole ?? user?.role ?? null;
}

export async function logCreate(user: AuditUser | null, table: string, id: string, data: unknown) {
  await auditLog({
    userId: user?.id,
    userName: user?.name,
    userRole: resolveRole(user),
    action: "CREATE",
    tableName: table,
    recordId: id,
    newValue: data,
    description: `${table} 생성`,
  });
}

export async function logUpdate(user: AuditUser | null, table: string, id: string, oldVal: unknown, newVal: unknown) {
  await auditLog({
    userId: user?.id,
    userName: user?.name,
    userRole: resolveRole(user),
    action: "UPDATE",
    tableName: table,
    recordId: id,
    oldValue: oldVal,
    newValue: newVal,
    description: `${table} 수정`,
  });
}

export async function logSoftDelete(user: AuditUser | null, table: string, id: string) {
  await auditLog({
    userId: user?.id,
    userName: user?.name,
    userRole: user?.userRole,
    action: "DELETE",
    tableName: table,
    recordId: id,
    description: `${table} 소프트 삭제`,
  });
}