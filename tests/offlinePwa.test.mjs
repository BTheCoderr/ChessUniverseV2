import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("PWA config caches only the current app shell plus offline chess assets", async () => {
  const vite = await source("vite.config.ts");
  assert.match(vite, /VitePWA/);
  assert.match(vite, /registerType:\s*"autoUpdate"/);
  assert.match(vite, /"stockfish\.js"/);
  assert.match(vite, /"stockfish-nnue-16-single\.wasm"/);
  assert.match(vite, /"images\/pieces\/\*\.svg"/);
  assert.match(vite, /globPatterns:\s*\["index\.html", "assets\/\*\.\{js,css\}"\]/);
  assert.doesNotMatch(vite, /globPatterns:\s*\["\*\*\/\*/);
});

test("online and account surfaces are gated when the device is offline", async () => {
  const app = await source("src/App.tsx");
  assert.match(app, /navigator\.onLine/);
  assert.match(app, /window\.addEventListener\("offline"/);
  assert.match(app, /view === "online" && !isOnline/);
  assert.match(app, /view === "online" && isOnline && session && onlineGameId/);
  assert.match(app, /view === "account" && !isOnline/);
  assert.match(app, /Offline mode — Learn, Practice, .*Legends, Queens, Horse, and Stockfish are available/);
});

test("the installable app exposes mobile PWA metadata", async () => {
  const html = await source("index.html");
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /pwa-icon\.svg/);
});
