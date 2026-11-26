#!/usr/bin/env node
/**
 * Playwright captures of the BUILT WEBSITE (vite preview), not the iOS app.
 * Every file is prefixed "website-" so it is never mistaken for native iOS.
 *   BASE_URL=http://127.0.0.1:4173 node scripts/qa/web-captures.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const out = path.resolve(process.env.OUT_DIR ?? "qa-captures/website");
mkdirSync(out, { recursive: true });
const log = [];
const note = (m) => { log.push(m); console.log(m); };

const browser = await chromium.launch();
// 440x956 CSS px at 3x = 1320x2868, Apple's 6.9" iPhone screenshot size.
const context = await browser.newContext({
  ...devices["iPhone 15 Pro Max"],
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  recordVideo: { dir: out, size: { width: 440, height: 956 } },
});
await context.addInitScript(() => { try { localStorage.setItem("chess-universe-onboarding-v1", "done"); } catch {} });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

async function shot(name) { await page.waitForTimeout(700); await page.screenshot({ path: path.join(out, `website-${name}.png`) }); note(`captured website-${name}.png`); }
async function home() { await page.goto(base, { waitUntil: "networkidle" }); }
async function clickText(text) {
  const el = page.getByRole("button", { name: text, exact: true }).first();
  await el.click({ timeout: 8000 });
}
async function tryStep(name, fn) { try { await fn(); } catch (e) { note(`STEP FAILED ${name}: ${e.message.split("\n")[0]}`); } }

await tryStep("home", async () => { await home(); await shot("01-home"); });
await tryStep("practice", async () => {
  await home(); await clickText("Play now");
  await page.locator("[data-square]").first().waitFor({ timeout: 10000 });
  await shot("02-practice-start");
  for (const [from, to] of [["e7", "e5"], ["g8", "f6"], ["b8", "c6"]]) {
    await page.locator(`[data-square="${from}"]`).click();
    await page.locator(`[data-square="${to}"]`).click();
    await page.waitForTimeout(2500);
  }
  await shot("02b-practice-midgame");
});
for (const [label, button] of [["03-academy", "Learn chess"], ["04-puzzles", "Puzzles"], ["05-legends", "Legends"], ["06-online", "Find a game"]]) {
  await tryStep(label, async () => { await home(); await clickText(button); await shot(label); });
}
await tryStep("privacy", async () => { await page.goto(`${base}/privacy`, { waitUntil: "networkidle" }); await shot("07-privacy"); });
await tryStep("support", async () => { await page.goto(`${base}/support`, { waitUntil: "networkidle" }); await shot("08-support"); });

const video = page.video();
await context.close();
if (video) note(`video ${await video.path()}`);
await browser.close();
writeFileSync(path.join(out, "capture-log.txt"), [`source=WEBSITE (vite preview of this commit), NOT native iOS`, `base=${base}`, ...log, "", "page errors:", ...errors].join("\n"));
