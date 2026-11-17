import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const json = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
const config = readFileSync(new URL("../app.config.ts", import.meta.url), "utf8");
const eas = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));

test("iOS native version matches the rejected App Store Connect 1.0 version record", () => {
  assert.equal(json.expo.version, "1.0");
  assert.match(config, /version: "1\.0"/);
  assert.equal(json.expo.ios.bundleIdentifier, "com.bthecoderr.chessuniverse");
  assert.match(config, /bundleIdentifier: "com\.bthecoderr\.chessuniverse"/);
});

test("EAS production uses build-number increment and existing App Store app id", () => {
  assert.equal(eas.cli.appVersionSource, "remote");
  assert.equal(eas.build.production.autoIncrement, true);
  assert.equal(eas.submit.production.ios.ascAppId, "6822133409");
});
