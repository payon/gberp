import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";

export async function POST(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "알림 ID가 필요합니다." }, { status: 400 });
  const row = await prisma.notificationQueue.findUnique({ where: { id } });
  if (!row || row.targetId !== user!.id || row.channel !== "IN_APP") {
    return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });
  }
  await prisma.notificationQueue.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
  });
  return NextResponse.json({ data: { id, read: true } });
}
