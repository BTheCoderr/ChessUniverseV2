import { access, readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const required = [
  "dist/index.html",
  "dist/sw.js",
  "dist/manifest.webmanifest",
  "dist/pwa-icon.svg",
  "dist/stockfish.js",
  "dist/stockfish-nnue-16-single.wasm",
  "dist/images/pieces/bB.svg",
  "dist/images/pieces/bK.svg",
  "dist/images/pieces/bN.svg",
  "dist/images/pieces/bP.svg",
  "dist/images/pieces/bQ.svg",
  "dist/images/pieces/bR.svg",
  "dist/images/pieces/wB.svg",
  "dist/images/pieces/wK.svg",
  "dist/images/pieces/wN.svg",
  "dist/images/pieces/wP.svg",
  "dist/images/pieces/wQ.svg",
  "dist/images/pieces/wR.svg",
];

await Promise.all(required.map((path) => access(path)));

const manifest = JSON.parse(await readFile("dist/manifest.webmanifest", "utf8"));
assert.equal(manifest.name, "Chess Universe");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "/");
assert.ok(
  manifest.icons?.some((icon) => icon.src === "/pwa-icon.svg"),
  "PWA icon is missing from the web manifest"
);

const sw = await readFile("dist/sw.js", "utf8");
for (const asset of [
  "stockfish.js",
  "stockfish-nnue-16-single.wasm",
  "images/pieces/bN.svg",
  "images/pieces/wK.svg",
]) {
  assert.ok(sw.includes(asset), `${asset} is not precached by the service worker`);
}

const index = await readFile("dist/index.html", "utf8");
assert.ok(
  index.includes("manifest.webmanifest") || index.includes("registerSW"),
  "built app does not contain PWA registration/manifest wiring"
);

console.log("Offline PWA artifact verified.");
