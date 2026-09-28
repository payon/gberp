// 클라이언트 번들 안전 모듈 (sharp/file-system import 금지)
export const APP_ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512] as const;

export const APP_ICON_FILES = {
  sized: (s: number) => `app-${s}.png`,
  maskable: "app-maskable-512.png",
  appleTouch: "apple-touch-icon.png",
  favicon: "favicon-32.png",
};
