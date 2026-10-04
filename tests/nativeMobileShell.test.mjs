import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  NATIVE_URL_SCHEME,
  PUBLIC_APP_URL,
  challengeIdFromUrl,
  publicChallengeUrl,
} from "../src/lib/nativeLinks.ts";

const GAME_ID = "123e4567-e89b-12d3-a456-426614174000";

test("native and public challenge links resolve the same game", () => {
  assert.equal(PUBLIC_APP_URL, "https://chessuniverse.netlify.app");
  assert.equal(NATIVE_URL_SCHEME, "chessuniverse");

  assert.equal(
    challengeIdFromUrl(`https://chessuniverse.netlify.app/?challenge=${GAME_ID}`),
    GAME_ID
  );
  assert.equal(
    challengeIdFromUrl(`chessuniverse://challenge/${GAME_ID}`),
    GAME_ID
  );
  assert.equal(challengeIdFromUrl("chessuniverse://challenge/not-a-game"), null);
  assert.equal(challengeIdFromUrl("not a url"), null);

  assert.equal(
    publicChallengeUrl(GAME_ID),
    `https://chessuniverse.netlify.app/?challenge=${GAME_ID}`
  );
});

test("Capacitor uses the production web build and stable native identity", async () => {
  const config = await readFile(new URL("../capacitor.config.ts", import.meta.url), "utf8");

  assert.match(config, /appId:\s*"com\.bthecoderr\.chessuniverse"/);
  assert.match(config, /appName:\s*"Chess Universe"/);
  assert.match(config, /webDir:\s*"dist"/);
  assert.match(config, /androidScheme:\s*"https"/);
});

test("package scripts can initialize, configure, sync, and open both native platforms", async () => {
  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8")
  );

  assert.match(pkg.dependencies["@capacitor/core"], /^\^8\./);
  assert.match(pkg.dependencies["@capacitor/app"], /^\^8\./);
  assert.match(pkg.dependencies["@capacitor/haptics"], /^\^8\./);
  assert.match(pkg.dependencies["@capacitor/status-bar"], /^\^8\./);
  assert.match(pkg.devDependencies["@capacitor/ios"], /^\^8\./);
  assert.match(pkg.devDependencies["@capacitor/android"], /^\^8\./);
  assert.match(pkg.devDependencies["@capacitor/cli"], /^\^8\./);

  for (const script of [
    "build:native",
    "mobile:init:ios",
    "mobile:init:android",
    "mobile:configure",
    "mobile:assets",
    "mobile:sync",
    "mobile:open:ios",
    "mobile:open:android",
  ]) {
    assert.ok(pkg.scripts[script], `${script} should exist`);
  }
});

test("native shell has safe areas, bottom tabs, deep links, and haptics", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const runtime = await readFile(new URL("../src/lib/nativeRuntime.ts", import.meta.url), "utf8");
  const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  const tabs = await readFile(new URL("../src/components/NativeTabBar.tsx", import.meta.url), "utf8");
  const feedback = await readFile(new URL("../src/lib/feedback.ts", import.meta.url), "utf8");

  assert.match(app, /registerNativeUrlListener/);
  assert.match(app, /NativeTabBar/);
  assert.match(runtime, /Capacitor\.isNativePlatform/);
  assert.match(runtime, /appUrlOpen/);
  assert.match(runtime, /StatusBar\.setStyle/);
  assert.match(feedback, /nativeImpact/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /native-tab-bar/);
  assert.match(tabs, /Home/);
  assert.match(tabs, /Play/);
  assert.match(tabs, /Learn/);
  assert.match(tabs, /Online/);
  assert.match(tabs, /Profile/);
});

test("native Vite build skips the browser PWA service worker", async () => {
  const vite = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.match(vite, /mode === "native"/);
  assert.match(vite, /VitePWA/);
  assert.match(pkg.scripts["build:native"], /vite build --mode native/);
  assert.match(pkg.scripts["mobile:sync"], /build:native/);
});

test("native project configurator registers custom challenge URL schemes", async () => {
  const script = await readFile(
    new URL("../scripts/configure-native-projects.mjs", import.meta.url),
    "utf8"
  );

  assert.match(script, /CFBundleURLSchemes/);
  assert.match(script, /<string>chessuniverse<\/string>/);
  assert.match(script, /android:scheme=\\"chessuniverse\\"/);
  assert.match(script, /android:host=\\"challenge\\"/);
});

test("shared online invitations never use the Capacitor localhost origin", async () => {
  const lobby = await readFile(
    new URL("../src/components/OnlineLobby.tsx", import.meta.url),
    "utf8"
  );

  assert.match(lobby, /publicChallengeUrl/);
  assert.doesNotMatch(lobby, /new URL\(window\.location\.origin\)/);
});
