import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pushToUserIds, pushToRole } from "@/lib/push";
import { hasRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (!hasRole(session.user.role as UserRole, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATOR])) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const title: string = body?.title?.trim();
  const message: string = body?.message?.trim() ?? "";
  if (!title) {
    return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  }

  const payload = {
    title,
    body: message || "",
    url: body?.url || "/driver",
    tag: body?.tag || `dispatch-${Date.now()}`,
  };

  let userIds: string[] | null = null;
  if (body?.userIds && Array.isArray(body.userIds)) {
    userIds = body.userIds.map((x: any) => String(x)).filter(Boolean);
  } else if (body?.role) {
    const users = await prisma.user.findMany({
      where: { role: body.role as any, deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });
    userIds = users.map((u) => u.id);
  }

  if (userIds && userIds.length > 0) {
    const result = await pushToUserIds(userIds, payload);
    return NextResponse.json({ mode: "users", ...result });
  }

  if (body?.role) {
    const result = await pushToRole(body.role, payload);
    return NextResponse.json({ mode: "role", ...result });
  }

  const result = await pushToRole("DRIVER", payload);
  return NextResponse.json({ mode: "role", role: "DRIVER", ...result });
}