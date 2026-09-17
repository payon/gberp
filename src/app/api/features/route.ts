import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { enabledFeatures } from "@/lib/features";

// 클라이언트에서 표시/제어에 필요한 기능 토글 상태 (민감값 없음)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json(enabledFeatures(settings));
}