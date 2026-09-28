import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { SECURITY_POLICY } from "./security-policy";
import { APP_ICON_SIZES, APP_ICON_FILES } from "./app-icon-meta";

// PWA/TWA 공용 앱 아이콘 세트. 원본 1장으로 데스크탑·모바일·태블릿 설치 아이콘을 일괄 생성한다.
export const APP_ICON_DIR = path.join(process.cwd(), "public", "icons");

export type GeneratedAppIcons = {
  sizes: number[];
  files: string[];
  iconPath: string;
  updatedAt: string;
};

export async function generateAppIcons(buf: Buffer): Promise<GeneratedAppIcons> {
  const meta = await sharp(buf, { limitInputPixels: SECURITY_POLICY.upload.logoMaxPixels }).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("이미지 정보를 읽을 수 없습니다.");
  }
  if (meta.width < 512 || meta.height < 512) {
    throw new Error("앱 아이콘 원본은 512×512 이상이어야 합니다.");
  }
  const ratio = meta.width / meta.height;
  if (ratio < 0.9 || ratio > 1.1) {
    throw new Error("앱 아이콘 원본은 정사각형이어야 합니다.");
  }

  mkdirSync(APP_ICON_DIR, { recursive: true });
  const files: string[] = [];

  for (const s of APP_ICON_SIZES) {
    const out = await sharp(buf).resize(s, s, { fit: "cover" }).png().toBuffer();
    const name = APP_ICON_FILES.sized(s);
    writeFileSync(path.join(APP_ICON_DIR, name), out);
    files.push(`/icons/${name}`);
  }

  // maskable: 안전영역 80% + 패딩
  const inner = await sharp(buf).resize(410, 410, { fit: "cover" }).png().toBuffer();
  const maskable = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: inner, left: 51, top: 51 }])
    .png()
    .toBuffer();
  writeFileSync(path.join(APP_ICON_DIR, APP_ICON_FILES.maskable), maskable);
  files.push(`/icons/${APP_ICON_FILES.maskable}`);

  // iOS 홈화면 / 브라우저 탭
  const apple = await sharp(buf).resize(180, 180, { fit: "cover" }).png().toBuffer();
  writeFileSync(path.join(APP_ICON_DIR, APP_ICON_FILES.appleTouch), apple);
  const fav = await sharp(buf).resize(32, 32, { fit: "cover" }).png().toBuffer();
  writeFileSync(path.join(APP_ICON_DIR, APP_ICON_FILES.favicon), fav);

  return {
    sizes: [...APP_ICON_SIZES],
    files,
    iconPath: `/icons/${APP_ICON_FILES.sized(512)}`,
    updatedAt: new Date().toISOString(),
  };
}
