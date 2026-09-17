import { AuditAction, UserRole } from "@prisma/client";
import { prisma } from "./prisma";

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
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

export async function auditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? "system",
        userName: input.userName || null,
        userRole: input.userRole || null,
        action: input.action,
        tableName: input.tableName,
        recordId: input.recordId || null,
        oldValue: safeJson(input.oldValue),
        newValue: safeJson(input.newValue),
        description: input.description || null,
      },
    });
  } catch (e) {
    console.error("audit log write failed:", e);
  }
}

// 소프트 삭제 형태: 수정/삭제 시 감사 로그 남김
export async function logCreate(user: { id: string; name?: string | null; userRole?: UserRole } | null, table: string, id: string, data: unknown) {
  await auditLog({
    userId: user?.id,
    userName: user?.name,
    userRole: user?.userRole,
    action: "CREATE",
    tableName: table,
    recordId: id,
    newValue: data,
    description: `${table} 생성`,
  });
}

export async function logUpdate(user: { id: string; name?: string | null; userRole?: UserRole } | null, table: string, id: string, oldVal: unknown, newVal: unknown) {
  await auditLog({
    userId: user?.id,
    userName: user?.name,
    userRole: user?.userRole,
    action: "UPDATE",
    tableName: table,
    recordId: id,
    oldValue: oldVal,
    newValue: newVal,
    description: `${table} 수정`,
  });
}

export async function logSoftDelete(user: { id: string; name?: string | null; userRole?: UserRole } | null, table: string, id: string) {
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