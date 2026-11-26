import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync("src/styles.css","utf8");
const html = readFileSync("index.html","utf8");
const vite = readFileSync("vite.config.ts","utf8");
const mobile = readFileSync("apps/mobile/lib/theme.ts","utf8");

function declared(css, prop) {
  const match = css.match(new RegExp("--"+prop+":\\s*(#[a-fA-F0-9]{6})\\s*;"));
  assert.ok(match, "Missing CSS token: "+prop);
  return match[1].toUpperCase();
}

test("web primary palette is in parity with gold-knight mobile palette", () => {
  const tokens = [
    ["ink","background","#08152D"],
    ["panel","surface","#11233F"],
    ["line","surfaceBorder","#2F4563"],
    ["muted","muted","#A6B7CB"],
    ["accent","accent","#F2C064"],
    ["accent-ink","accentInk","#08152D"]
  ];
  for (const [cssKey,mobileKey,value] of tokens) {
    assert.equal(declared(stylesheet,cssKey),value);
    assert.ok(mobile.includes(mobileKey+': "'+value+'"'), "Mobile palette drift: "+mobileKey);
  }
  assert.equal(declared(stylesheet,"board-light"),"#E8DCC4");
  assert.equal(declared(stylesheet,"board-dark"),"#526E8D");
});

test("website and installable PWA use midnight-navy browser surfaces", () => {
  assert.ok(html.includes('<meta name="theme-color" content="#08152D"'));
  assert.ok(vite.includes('theme_color: "#08152D"'));
  assert.ok(vite.includes('background_color: "#08152D"'));
});

test("website does not still use lime and olive styling", () => {
  assert.doesNotMatch(stylesheet, /#(?:d7ff4a|4c5c16|596b20|697b65|0b0e0f)\b/i);
  assert.doesNotMatch(stylesheet, /rgba\(\s*215\s*,\s*255\s*,\s*74/);
  assert.match(stylesheet,/\.square\.dark\s*\{\s*background:\s*var\(--board-dark\)/);
  assert.match(stylesheet,/\.square\.selected\s*\{\s*box-shadow:\s*inset .*var\(--accent\)/);
});

test("native asset generation script uses the midnight-navy brand, not legacy lime", async () => {
  const { readFileSync } = await import("node:fs");
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.doesNotMatch(pkg.scripts["mobile:assets"], /#(?:d7ff4a|0b0e0f|101314)/i);
  assert.match(pkg.scripts["mobile:assets"], /#08152D/);
});
