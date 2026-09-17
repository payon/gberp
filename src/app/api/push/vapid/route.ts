import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { vapidConfig, pushReady } from "@/lib/push";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json({
    enabled: pushReady(),
    publicKey: vapidConfig().publicKey ?? null,
  });
}