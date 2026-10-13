import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  IOS_APP_VERSION,
  PUBLIC_PAGE_PATHS,
  SUPPORT_EMAIL,
  documentTitleFor,
  publicPageFromPath,
} from "../src/lib/publicPages.ts";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public page paths resolve, including trailing slashes and mixed case", () => {
  assert.equal(publicPageFromPath("/support"), "support");
  assert.equal(publicPageFromPath("/privacy/"), "privacy");
  assert.equal(publicPageFromPath("/About"), "about");
  assert.equal(publicPageFromPath("/terms"), "terms");
  assert.equal(publicPageFromPath("/"), null);
  assert.equal(publicPageFromPath("/support/extra"), null);
  assert.equal(documentTitleFor("privacy"), "Privacy Policy · Chess Universe");
  assert.equal(documentTitleFor(null), "Chess Universe");
});

test("iOS version shown on Support comes from the Expo app config", async () => {
  const mobile = JSON.parse(await source("apps/mobile/app.json"));
  assert.equal(IOS_APP_VERSION, mobile.expo.version);
});

test("App renders public pages from the URL and links them from the footer", async () => {
  const app = await source("src/App.tsx");
  assert.match(app, /publicPageFromLocation\(\) \?\?/);
  assert.match(app, /addEventListener\("popstate"/);
  for (const page of ["support", "privacy", "about"]) {
    assert.match(app, new RegExp(`href=\\{PUBLIC_PAGE_PATHS\\.${page}\\}`));
  }
  assert.match(app, /<SupportPage\b/);
  assert.match(app, /<AboutPage\b/);
  assert.equal(PUBLIC_PAGE_PATHS.support, "/support");
});

test("direct URLs fall back to the app shell on Netlify and offline", async () => {
  const netlify = await source("netlify.toml");
  const vite = await source("vite.config.ts");
  assert.match(netlify, /from = "\/\*"\s+to = "\/index\.html"\s+status = 200/);
  assert.match(vite, /navigateFallback: "\/index\.html"/);
});

test("support and privacy share one contact address and describe real deletion", async () => {
  const support = await source("src/components/SupportPage.tsx");
  const legal = await source("src/components/LegalPage.tsx");
  const deleteFn = await source("supabase/functions/delete-account/index.ts");

  assert.match(SUPPORT_EMAIL, /^[^@\s]+@[^@\s]+\.[a-z]+$/);
  assert.match(support, /SUPPORT_EMAIL/);
  assert.match(legal, /SUPPORT_EMAIL/);
  assert.match(support, /id="delete-account"/);
  assert.match(support, /Type <strong>DELETE<\/strong>/);
  assert.match(deleteFn, /auth\.admin\.deleteUser/);
  assert.match(deleteFn, /\.neq\("status", "completed"\)/);
  assert.doesNotMatch(legal, /Google Analytics|Mixpanel|Firebase|Sentry|PostHog|Amplitude/);
});
