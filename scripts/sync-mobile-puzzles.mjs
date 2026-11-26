#!/usr/bin/env node
/**
 * Keep the native iOS puzzle set identical to the website's curated offline
 * puzzles. Source of truth: src/lib/puzzles.ts (OFFLINE_PUZZLES).
 * Output: apps/mobile/lib/puzzleData.ts — do not edit by hand.
 *
 *   node scripts/sync-mobile-puzzles.mjs          # regenerate
 *   node scripts/sync-mobile-puzzles.mjs --check  # CI drift check
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(path.join(root, "src/lib/puzzles.ts"), "utf8");
const out = path.join(root, "apps/mobile/lib/puzzleData.ts");

const start = source.indexOf("export const OFFLINE_PUZZLES: Puzzle[] = [");
if (start < 0) throw new Error("OFFLINE_PUZZLES not found in src/lib/puzzles.ts");
const open = source.indexOf("[", start + "export const OFFLINE_PUZZLES: Puzzle[] =".length);
const close = source.indexOf("\n];", open);
if (close < 0) throw new Error("Could not find the end of OFFLINE_PUZZLES");
const literal = source.slice(open, close + 2);
// The array is a plain data literal (strings and booleans only).
const codeOnly = literal.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
if (/\b(?:function|import|require|new|await)\b|=>|\(/.test(codeOnly)) throw new Error("OFFLINE_PUZZLES is no longer a plain data literal");
const web = Function(`"use strict"; return (${literal});`)();

const keys = ["id", "title", "level", "theme", "fen", "solution", "goal", "hint", "explanation", "takeaway", "mistakeLesson"];
const puzzles = web.map((p) => {
  for (const key of keys) if (typeof p[key] !== "string" || !p[key]) throw new Error(`Puzzle ${p.id ?? "?"} is missing ${key}`);
  return Object.fromEntries([...keys.map((k) => [k, p[k]]), ["expectsMate", Boolean(p.expectsMate)]]);
});

const generated = `/**
 * Generated from ../../src/lib/puzzles.ts (website OFFLINE_PUZZLES).
 * Do not edit directly. Regenerate: node scripts/sync-mobile-puzzles.mjs
 */
export type WebPuzzle = {
  id: string;
  title: string;
  level: string;
  theme: string;
  fen: string;
  /** UCI, e.g. "e2e4" or "a7a8q" */
  solution: string;
  goal: string;
  hint: string;
  explanation: string;
  takeaway: string;
  mistakeLesson: string;
  expectsMate: boolean;
};

export const WEB_PUZZLES: WebPuzzle[] = ${JSON.stringify(puzzles, null, 2)};
`;

if (process.argv.includes("--check")) {
  const actual = readFileSync(out, "utf8");
  if (actual !== generated) {
    console.error("Native puzzles have drifted from the website set. Run node scripts/sync-mobile-puzzles.mjs");
    process.exitCode = 1;
  } else console.log(`Native and web puzzle sets match (${puzzles.length} puzzles).`);
} else {
  writeFileSync(out, generated, "utf8");
  console.log(`Synced ${puzzles.length} native puzzles from src/lib/puzzles.ts.`);
}
