import { NextResponse } from "next/server";
import { getSettings, setting } from "@/lib/settings";

const PUBLIC_KEYS = ["company.name", "company.logoPath"] as const;

export async function GET() {
  const settings = await getSettings();
  const out: Record<string, string> = {};
  for (const key of PUBLIC_KEYS) out[key] = setting(settings, key);
  return NextResponse.json({ settings: out });
}