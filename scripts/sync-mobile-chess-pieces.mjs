#!/usr/bin/env node
/**
 * Keep native iOS artwork *identical* to the existing website piece SVGs.
 * Source of truth: public/images/pieces/{w,b}{K,Q,R,B,N,P}.svg
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "apps/mobile/lib/chessPieceArtwork.ts");
const colors = ["w", "b"];
const types = ["K", "Q", "R", "B", "N", "P"];
const lines = [
  `/**
 * Generated from ../../public/images/pieces/*.svg — the website's chess set.
 * Single canonical art for all native chess modes; do not edit directly.
 * Regenerate: node scripts/sync-mobile-chess-pieces.mjs
 */`,
  `import type { Color, PieceSymbol } from "chess.js";`,
  `export const CHESS_PIECE_ARTWORK: Record<Color, Record<PieceSymbol, string>> = {`
];

for (const color of colors) {
  lines.push(`  ${color}: {`);
  for (const type of types) {
    const file = path.join(root, "public/images/pieces", `${color}${type}.svg`);
    const xml = readFileSync(file, "utf8").trim();
    if (!xml.startsWith("<svg ") || !xml.endsWith("</svg>"))
      throw new Error(`Invalid chess piece source SVG: ${file}`);
    lines.push(`    ${type.toLowerCase()}: ${JSON.stringify(xml)},`);
  }
  lines.push("  },");
}
lines.push("};");
const generated = lines.join("\n") + "\n";
if (process.argv.includes("--check")) {
  const actual = readFileSync(out, "utf8");
  if (actual !== generated) {
    console.error("Native piece artwork has drifted from the website SVG set. Run node scripts/sync-mobile-chess-pieces.mjs");
    process.exitCode = 1;
  } else {
    console.log("Native and web SVG chess piece artwork match for all 12 pieces.");
  }
} else {
  writeFileSync(out, generated, "utf8");
  console.log("Synced 12 native chess pieces from public/images/pieces.");
}
