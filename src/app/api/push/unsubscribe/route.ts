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
    body = {};
  }

  const endpoint: string = body?.endpoint;

  try {
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: session.user.id },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { userId: session.user.id },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "구독 해제 실패" }, { status: 500 });
  }
}