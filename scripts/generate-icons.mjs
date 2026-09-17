import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const outDir = resolve(root, "public/icons");
mkdirSync(outDir, { recursive: true });

const svg = (size, rounded, padding) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16a34a"/>
      <stop offset="1" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  ${rounded ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#g)"/>` : `<rect width="${size}" height="${size}" fill="url(#g)"/>`}
  <g transform="translate(${padding} ${padding}) scale(${(size - padding * 2) / size})">
    <rect x="${size * 0.12}" y="${size * 0.3}" width="${size * 0.76}" height="${size * 0.46}" rx="${size * 0.08}" fill="#ffffff"/>
    <rect x="${size * 0.22}" y="${size * 0.38}" width="${size * 0.56}" height="${size * 0.12}" rx="${size * 0.03}" fill="#0f766e"/>
    <rect x="${size * 0.19}" y="${size * 0.54}" width="${size * 0.62}" height="${size * 0.08}" rx="${size * 0.02}" fill="#0f766e"/>
    <circle cx="${size * 0.3}" cy="${size * 0.68}" r="${size * 0.06}" fill="#1f2937"/>
    <circle cx="${size * 0.7}" cy="${size * 0.68}" r="${size * 0.06}" fill="#1f2937"/>
    <circle cx="${size * 0.3}" cy="${size * 0.68}" r="${size * 0.024}" fill="#ffffff"/>
    <circle cx="${size * 0.7}" cy="${size * 0.68}" r="${size * 0.024}" fill="#ffffff"/>
    <rect x="${size * 0.44}" y="${size * 0.3}" width="${size * 0.12}" height="${size * 0.16}" rx="${size * 0.02}" fill="#0f766e"/>
  </g>
</svg>`;

async function render(name, size, rounded, padding) {
  const buf = Buffer.from(svg(size, rounded, padding), "utf-8");
  await sharp(buf).png().toFile(resolve(outDir, name));
  console.log("created", name);
}

await render("icon-192.png", 192, true, 14);
await render("icon-512.png", 512, true, 40);
await render("icon-maskable-512.png", 512, false, 116);
await render("apple-touch-icon.png", 180, true, 14);
await render("favicon.png", 64, true, 6);
console.log("done");