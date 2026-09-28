import { spawnSync } from "node:child_process";
import net from "node:net";

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const dbUrl = process.env.DATABASE_URL || "";
if (!dbUrl) {
  console.error("DATABASE_URL이 설정되지 않았습니다.");
  process.exit(1);
}

if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET === "change-me-in-production") {
  console.warn("[경고] NEXTAUTH_SECRET이 기본값입니다. 운영 전 반드시 변경하세요.");
}

function parseHostPort(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: Number(u.port) || 5432 };
  } catch {
    return { host: "db", port: 5432 };
  }
}

async function waitForDb(host, port, timeoutMs = 90000) {
  const start = Date.now();
  for (;;) {
    const ok = await new Promise((resolve) => {
      const s = net.connect({ host, port }, () => {
        s.end();
        resolve(true);
      });
      s.on("error", () => resolve(false));
      s.setTimeout(3000, () => {
        s.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    if (Date.now() - start > timeoutMs) {
      console.error(`DB(${host}:${port}) 연결 시간 초과`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: process.cwd() });
  if (r.status !== 0) {
    console.error(`명령 실패: ${cmd} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

const { host, port } = parseHostPort(dbUrl);
console.log(`DB 대기 중... ${host}:${port}`);
await waitForDb(host, port);

run("npx", ["prisma", "db", "push"]);

if (process.env.SEED_ON_BOOT === "true") {
  run("npx", ["prisma", "db", "seed"]);
}

await import("./start.mjs");
