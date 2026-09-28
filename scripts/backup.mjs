// DB + 업로드 폴더 일일 스냅샷 (30일 로테이션)
// 사용: node scripts/backup.mjs [backupDir]  (기본: <project>/backup)
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";
import path from "path";

const root = process.cwd();
const backupDir = process.argv[2] ?? path.join(root, "backup");
mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const snapDir = path.join(backupDir, `custom-${stamp}`);
mkdirSync(snapDir, { recursive: true });

const dbFile = path.join(root, "db", "custom.db");
if (existsSync(dbFile)) {
  copyFileSync(dbFile, path.join(snapDir, "custom.db"));
  for (const suffix of ["-wal", "-shm"]) {
    const f = dbFile + suffix;
    if (existsSync(f)) copyFileSync(f, path.join(snapDir, `custom.db${suffix}`));
  }
}
const uploads = path.join(root, "public", "uploads");
if (existsSync(uploads)) {
  cpSync(uploads, path.join(snapDir, "uploads"), { recursive: true });
}

const keepMs = 30 * 24 * 60 * 60 * 1000;
const now = Date.now();
for (const name of readdirSync(backupDir)) {
  const p = path.join(backupDir, name);
  try {
    if (statSync(p).isDirectory() && now - statSync(p).mtimeMs > keepMs) {
      rmSync(p, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }
}

console.log(`backup done: ${snapDir}`);
