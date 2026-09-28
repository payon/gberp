import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/crud";

export async function GET() {
  const { user, response } = await getSessionUser();
  if (response) return response;
  const rows = await prisma.notificationQueue.findMany({
    where: { targetId: user!.id, channel: "IN_APP" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      read: r.status !== "PENDING",
      createdAt: r.createdAt,
    })),
    unread: rows.filter((r) => r.status === "PENDING").length,
  });
}
