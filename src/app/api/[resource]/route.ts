import { NextRequest } from "next/server";
import { handleList, handleCreate } from "@/lib/crud";

export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) {
  const { resource } = await ctx.params;
  return handleList(req, resource);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) {
  const { resource } = await ctx.params;
  return handleCreate(req, resource);
}