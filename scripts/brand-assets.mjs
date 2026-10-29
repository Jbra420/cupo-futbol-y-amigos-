import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import ts from "typescript";
import sharp from "sharp";

// Read the same geometry used by React and Open Graph, without an extra runtime dependency.
const source = ts.transpileModule(readFileSync("src/lib/brand.ts", "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const brandModule = { exports: {} };
new Function("module", "exports", source)(brandModule, brandModule.exports);
const { brandSvg } = brandModule.exports;
mkdirSync("public/brand", { recursive: true });
const light = brandSvg();
const dark = brandSvg({
  ink: "#edf1e8",
  accent: "#b9e66f",
  ballInk: "#111d17",
});
writeFileSync("public/brand/cupo-on-light.svg", light);
writeFileSync("public/brand/cupo-on-dark.svg", dark);
const symbol = brandSvg({
  ink: "#edf1e8",
  accent: "#b9e66f",
  ballInk: "#14291d",
  symbol: true,
});
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#14291d"/><svg x="8" y="8" width="48" height="48" viewBox="0 0 48 48">${symbol.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg></svg>`;
writeFileSync("public/brand/cupo-symbol.svg", icon);
writeFileSync("src/app/icon.svg", icon);
await sharp(Buffer.from(icon))
  .resize(180, 180)
  .png()
  .toFile("src/app/apple-icon.png");
for (const size of [192, 512])
  await sharp(Buffer.from(icon))
    .resize(size, size)
    .png()
    .toFile(`public/brand/cupo-${size}.png`);
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) =>
    sharp(Buffer.from(icon)).resize(size, size).png().toBuffer(),
  ),
);
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (let i = 0; i < sizes.length; i++) {
  const at = 6 + 16 * i;
  header[at] = sizes[i];
  header[at + 1] = sizes[i];
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(images[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += images[i].length;
}
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...images]));
// A portable presentation of the actual assets for review and handoff.
mkdirSync("artifacts/brand", { recursive: true });
const board = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500"><rect width="600" height="500" fill="#f7f8f2"/><rect x="600" width="600" height="500" fill="#111d17"/><svg x="115" y="140" width="370" height="94" viewBox="0 0 190 48">${light.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg><svg x="715" y="140" width="370" height="94" viewBox="0 0 190 48">${dark.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg><text x="300" y="295" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#5c695e" letter-spacing="4">FÚTBOL CON TU GENTE</text><text x="900" y="295" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#abb9ad" letter-spacing="4">FÚTBOL CON TU GENTE</text><svg x="268" y="355" width="64" height="64" viewBox="0 0 64 64">${icon.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg><svg x="868" y="355" width="64" height="64" viewBox="0 0 64 64">${icon.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "")}</svg></svg>`;
await sharp(Buffer.from(board))
  .png()
  .toFile("artifacts/brand/cupo-identity.png");
console.log(
  "Identidad CUPO: SVG, favicon, iconos móviles y vista previa actualizados.",
);
