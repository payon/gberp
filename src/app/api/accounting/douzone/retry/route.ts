import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { getSettings, setting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";
import { pushToGateway } from "@/lib/douzone";
import { SECURITY_POLICY } from "@/lib/security-policy";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];
const MAX_DOUZONE_RETRY = 5;

export async function POST(req: NextRequest) {
  const { user, response } = await getSessionUser();
  if (response) return response;
  if (!hasRole(user!.role as UserRole, ROLES)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }
  const logId = String(body?.logId ?? "");
  if (!logId) return NextResponse.json({ error: "로그 ID가 필요합니다." }, { status: 400 });
  const log = await prisma.douzoneExportLog.findUnique({ where: { id: logId } });
  if (!log) return NextResponse.json({ error: "로그를 찾을 수 없습니다." }, { status: 404 });
  if (log.status === "SUCCESS") return NextResponse.json({ error: "이미 전송 성공한 건입니다." }, { status: 409 });
  if (log.retryCount >= MAX_DOUZONE_RETRY) return NextResponse.json({ error: `재시도 횟수(${MAX_DOUZONE_RETRY}회)를 초과했습니다.` }, { status: 409 });

  const settings = await getSettings();
  const endpointUrl = setting(settings, "douzone.endpointUrl").trim();
  const apiKey = setting(settings, "douzone.apiKey");
  if (!endpointUrl) return NextResponse.json({ error: "더존 엔드포인트가 설정되지 않았습니다." }, { status: 409 });

  let payload: any = {};
  try {
    payload = JSON.parse(log.requestPayload || "{}");
  } catch {
    payload = {};
  }
  await prisma.douzoneExportLog.update({
    where: { id: log.id },
    data: { status: "RETRYING", retryCount: log.retryCount + 1, lastRetryAt: new Date() },
  });
  try {
    const { ok, response: text } = await pushToGateway(endpointUrl, apiKey, { csv: String(payload.csv ?? ""), rows: payload.rows ?? [] });
    await prisma.douzoneExportLog.update({
      where: { id: log.id },
      data: ok
        ? { status: "SUCCESS", responsePayload: text, completedAt: new Date(), errorMessage: null }
        : { status: "FAILED", responsePayload: text, errorMessage: "게이트웨이 오류" },
    });
    await auditLog({
      userId: user!.id,
      userName: user!.name ?? "",
      action: "UPDATE",
      tableName: "douzone_export_logs",
      recordId: log.id,
      newValue: JSON.stringify({ retry: log.retryCount + 1, ok }),
    });
    return NextResponse.json({ data: { logId: log.id, status: ok ? "SUCCESS" : "FAILED" } });
  } catch (e: any) {
    await prisma.douzoneExportLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMessage: e?.message ?? "전송 실패" },
    });
    return NextResponse.json({ error: e?.message ?? "전송 실패" }, { status: 502 });
  }
}
