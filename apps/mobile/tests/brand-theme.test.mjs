import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const themeFile = readFileSync(path.join(root, "lib", "theme.ts"), "utf8");

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const location = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(location) : /\.(?:ts|tsx)$/.test(entry.name) ? [location] : [];
  });
}

test("The native theme reflects the gold knight's midnight-navy palette", () => {
  assert.match(themeFile, /background:\s*["']#08152D["']/);
  assert.match(themeFile, /surface:\s*["']#11233F["']/);
  assert.match(themeFile, /accent:\s*["']#F2C064["']/);
  assert.match(themeFile, /accentInk:\s*["']#08152D["']/);
  assert.match(themeFile, /boardDark:\s*["']#526E8D["']/);
});

test("No native screen reintroduces the old lime and charcoal colors", () => {
  const legacy = /#(?:d7ff4a|0b0e0f|151a1b|f5f7f0|9ca7a3|89938f|36403c|59635f|8c9793|202927)(?:[\da-f]{2})?\b/i;
  const files = [...sourceFiles(path.join(root, "app")), ...sourceFiles(path.join(root, "components")),path.join(root, "app.config.ts")];
  for (const file of files) {
    const code = readFileSync(file, "utf8");
    assert.doesNotMatch(code, legacy, path.relative(root, file) + " still uses legacy brand colors");
  }
  const config = JSON.parse(readFileSync(path.join(root, "app.json"),"utf8"));
  assert.equal(config.expo.backgroundColor, "#08152D");
  assert.equal(config.expo.primaryColor, "#F2C064");
});
