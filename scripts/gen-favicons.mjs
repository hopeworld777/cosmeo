/**
 * Generates favicon PNG assets and a favicon.ico from public/favicon.svg.
 * Run once: node scripts/gen-favicons.mjs
 *
 * Outputs (all in public/):
 *   favicon-16.png      — 16×16  browser tab fallback
 *   favicon-32.png      — 32×32  browser tab fallback
 *   apple-touch-icon.png — 180×180 iOS home screen
 *   favicon-192.png     — 192×192 Android / PWA
 *   favicon-512.png     — 512×512 PWA splash / maskable
 *   favicon.ico         — 16+32 ICO container (legacy browsers)
 */

import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "favicon.svg");
const svgData = readFileSync(svgPath, "utf8");

function renderPng(size) {
  const resvg = new Resvg(svgData, {
    fitTo: { mode: "width", value: size },
  });
  return resvg.render().asPng();
}

function buildIco(pngs) {
  // ICO format: header + directory entries + PNG data blobs
  const count = pngs.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = count * dirEntrySize;
  const dataOffset = headerSize + dirSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(count, 4);

  const dirs = [];
  const blobs = [];
  let offset = dataOffset;

  for (const { size, png } of pngs) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, 1); // height
    dir.writeUInt8(0, 2); // color count
    dir.writeUInt8(0, 3); // reserved
    dir.writeUInt16LE(1, 4); // planes
    dir.writeUInt16LE(32, 6); // bit count
    dir.writeUInt32LE(png.length, 8); // data size
    dir.writeUInt32LE(offset, 12); // offset to data
    dirs.push(dir);
    blobs.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirs, ...blobs]);
}

const sizes = [
  { name: "favicon-16.png",       size: 16  },
  { name: "favicon-32.png",       size: 32  },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-192.png",      size: 192 },
  { name: "favicon-512.png",      size: 512 },
];

console.log("Generating favicon assets from public/favicon.svg …");

const rendered = [];
for (const { name, size } of sizes) {
  const png = renderPng(size);
  const dest = join(root, "public", name);
  writeFileSync(dest, png);
  console.log(`  ✓ ${name}  (${size}×${size}, ${png.length} bytes)`);
  rendered.push({ size, png });
}

// Build ICO from 16×16 and 32×32
const ico = buildIco([rendered[0], rendered[1]]);
const icoDest = join(root, "public", "favicon.ico");
writeFileSync(icoDest, ico);
console.log(`  ✓ favicon.ico  (16+32, ${ico.length} bytes)`);

console.log("Done.");
