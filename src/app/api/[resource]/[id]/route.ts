import { NextRequest } from "next/server";
import { handleUpdate, handleDelete } from "@/lib/crud";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params;
  return handleUpdate(req, resource, id);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params;
  return handleDelete(req, resource, id);
}