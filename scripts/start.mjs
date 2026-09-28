import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const root = process.cwd();

// standalone server.js가 process.chdir(__dirname)로 cwd를 .next/standalone으로
// 바꾸고, SQLite file: 상대경로는 cwd 기준이므로 루트 .env를 먼저 읽어 절대경로로 고정한다.
function loadRootEnv() {
  const envFile = path.join(root, ".env");
  if (!existsSync(envFile)) return;
  const text = readFileSync(envFile, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const idx = t.indexOf("=");
    const key = t.slice(0, idx).trim();
    if (!key || process.env[key] !== undefined) continue;
    let val = t.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadRootEnv();

const dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.startsWith("file:")) {
  const raw = dbUrl.slice("file:".length);
  const isAbsolute = raw.startsWith("/") || /^[A-Za-z]:[\\/]/.test(raw);
  if (!isAbsolute) {
    // prisma/schema.prisma 기준 상대경로 → 프로젝트 루트 기준 절대경로
    const abs = path.resolve(path.join(root, "prisma"), raw);
    process.env.DATABASE_URL = `file:${abs}`;
  }
}

const serverJs = path.join(root, ".next", "standalone", "server.js");
await import(fileURLToPath(pathToFileURL(serverJs)));
