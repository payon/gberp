import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasRole } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { existsSync, unlinkSync } from "fs";
import path from "path";

const MANAGER_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export async function requireManager(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasRole(session.user.role as UserRole, MANAGER_ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return null;
}

export function removeStoredFile(dir: string, relPath: string) {
  if (!relPath) return;
  try {
    const name = path.basename(relPath);
    const file = path.join(dir, name);
    if (name && existsSync(file)) unlinkSync(file);
  } catch {
    // ignore
  }
}