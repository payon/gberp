import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standalone, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standalone, "public");

if (!existsSync(standalone)) {
  console.error("standalone 디렉토리가 없습니다. next build 하위 단계를 확인하세요.");
  process.exit(1);
}

mkdirSync(path.dirname(staticDest), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });
cpSync(publicSrc, publicDest, { recursive: true });
console.log("✓ standalone에 static/public 복사 완료");