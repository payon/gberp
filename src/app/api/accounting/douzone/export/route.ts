import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";
import { hasRole } from "@/lib/permissions";
import { getSettings, setting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";
import { mapTargets, toCsv, pushToGateway, type DouzoneTargetType } from "@/lib/douzone";
import { SECURITY_POLICY } from "@/lib/security-policy";
import type { UserRole } from "@prisma/client";

const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

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
  const targetType = String(body?.targetType ?? "");
  const ids = Array.isArray(body?.targetIds) ? body.targetIds.map(String).filter(Boolean) : [];
  if ((targetType !== "entry" && targetType !== "slip") || ids.length === 0) {
    return NextResponse.json({ error: "전송 대상이 필요합니다." }, { status: 400 });
  }
  if (ids.length > SECURITY_POLICY.douzone.maxTargets) {
    return NextResponse.json({ error: `한 번에 최대 ${SECURITY_POLICY.douzone.maxTargets}건까지 전송할 수 있습니다.` }, { status: 400 });
  }

  const { rows, targets } = await mapTargets(targetType as DouzoneTargetType, ids);
  if (targets.length === 0) {
    return NextResponse.json({ error: "전송할 대상을 찾을 수 없습니다." }, { status: 404 });
  }
  const csv = toCsv(rows);
  const settings = await getSettings();
  const endpointUrl = setting(settings, "douzone.endpointUrl").trim();
  const apiKey = setting(settings, "douzone.apiKey");

  const results: { targetId: string; logId: string; status: string }[] = [];
  for (const t of targets) {
    const targetRows = rows.filter((r) => r.reference === t.label || r.slipNumber === t.label);
    const log = await prisma.douzoneExportLog.create({
      data: {
        targetType,
        targetId: t.id,
        requestPayload: JSON.stringify({ target: t.label, csv: toCsv(targetRows) }),
        status: "PENDING",
      },
    });
    if (!endpointUrl) {
      results.push({ targetId: t.id, logId: log.id, status: "PENDING" });
      continue;
    }
    try {
      const { ok, response: text } = await pushToGateway(endpointUrl, apiKey, { csv: toCsv(targetRows), rows: targetRows });
      if (ok) {
        await prisma.douzoneExportLog.update({
          where: { id: log.id },
          data: { status: "SUCCESS", responsePayload: text, completedAt: new Date() },
        });
        if (targetType === "entry") {
          await prisma.accountingEntry.update({
            where: { id: t.id },
            data: { dzExportedAt: new Date(), dzExportStatus: "SUCCESS" },
          });
        } else {
          await prisma.accountingSlip.update({
            where: { id: t.id },
            data: { dzExportedAt: new Date() },
          });
        }
        results.push({ targetId: t.id, logId: log.id, status: "SUCCESS" });
      } else {
        await prisma.douzoneExportLog.update({
          where: { id: log.id },
          data: { status: "FAILED", responsePayload: text, errorMessage: "게이트웨이 오류" },
        });
        results.push({ targetId: t.id, logId: log.id, status: "FAILED" });
      }
    } catch (e: any) {
      await prisma.douzoneExportLog.update({
        where: { id: log.id },
        data: { status: "FAILED", errorMessage: e?.message ?? "전송 실패" },
      });
      results.push({ targetId: t.id, logId: log.id, status: "FAILED" });
    }
  }

  await auditLog({
    userId: user!.id,
    userName: user!.name ?? "",
    action: "CREATE",
    tableName: "douzone_export_logs",
    recordId: results.map((r) => r.logId).join(","),
    newValue: JSON.stringify({ targetType, count: targets.length }),
  });

  const failed = results.filter((r) => r.status === "FAILED").length;
  return NextResponse.json({ data: { results, total: results.length, failed, queued: !endpointUrl } }, { status: 201 });
}
