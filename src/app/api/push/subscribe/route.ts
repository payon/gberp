import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const endpoint: string = body?.endpoint;
  const p256dh: string = body?.keys?.p256dh;
  const auth: string = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth,
        userAgent: req.headers.get("user-agent") ?? null,
      },
      update: {
        userId: session.user.id,
        p256dh,
        auth,
        userAgent: req.headers.get("user-agent") ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "구독 저장 실패" }, { status: 500 });
  }
}