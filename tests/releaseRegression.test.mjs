import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("production signup confirmation returns to Chess Universe", async () => {
  const auth = await source("src/components/AuthPanel.tsx");
  assert.match(auth, /const PRODUCTION_SITE_URL = "https:\/\/chessuniverse\.netlify\.app"/);
  assert.match(auth, /import\.meta\.env\.PROD[\s\S]*PRODUCTION_SITE_URL[\s\S]*window\.location\.origin/);
  assert.match(auth, /emailRedirectTo/);
});

test("profile identity comes from the profiles table before email fallback", async () => {
  const auth = await source("src/components/AuthPanel.tsx");
  assert.match(auth, /\.from\("profiles"\)/);
  assert.match(auth, /select\("username,rating,wins,losses,draws"\)/);
  const usernameIndex = auth.indexOf("profile?.username");
  const emailFallbackIndex = auth.indexOf('session.user.email?.split("@")[0]');
  assert.ok(usernameIndex >= 0);
  assert.ok(emailFallbackIndex > usernameIndex);
});

test("online lobby keeps personal live and completed games separate from public discovery", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");
  assert.match(lobby, /participantFilter/);
  assert.match(lobby, /completedFilter/);
  assert.match(lobby, /\.eq\("is_private", false\)/);
  assert.match(lobby, /\.in\("status", \["waiting", "active"\]\)/);
  assert.match(lobby, /\.eq\("status", "completed"\)/);
  assert.match(lobby, /publicWaitingResult/);
  assert.match(lobby, /myLiveResult/);
  assert.match(lobby, /myCompletedResult/);
  assert.match(lobby, /game\.white_id === session\.user\.id \|\| game\.black_id === session\.user\.id/);
  assert.match(lobby, /\bResume\b/);
  assert.match(lobby, /Recent Classic games/);
});

test("casual lobby exposes untimed and timed choices", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");
  for (const minutes of [0, 10, 15, 30]) {
    assert.match(lobby, new RegExp(`minutes: ${minutes}\\b`));
  }
});

test("browser online move payload sends coordinates, not a computed board position", async () => {
  const game = await source("src/components/OnlineGame.tsx");
  const invokeIndex = game.indexOf('action: "move"');
  assert.ok(invokeIndex >= 0);
  const payload = game.slice(invokeIndex, invokeIndex + 260);
  assert.match(payload, /from: move\.from/);
  assert.match(payload, /to: move\.to/);
  assert.match(payload, /promotion:/);
  assert.doesNotMatch(payload, /fen\s*:/i);
  assert.doesNotMatch(payload, /position\s*:/i);
});

test("Traditional, Evolving Queens, and Magic Horse remain separate app views", async () => {
  const app = await source("src/App.tsx");
  assert.match(app, /<LocalGame[\s\S]*?onOpenLibrary=/);
  assert.match(app, /<EvolvingQueensGame \/>/);
  assert.match(app, /<MagicHorseGame \/>/);
  assert.match(app, /<OnlineGame\b/);
});

test("release config pins Node and sends baseline browser security headers", async () => {
  const netlify = await source("netlify.toml");
  const workflow = await source(".github/workflows/ci.yml");
  const nvmrc = (await source(".nvmrc")).trim();

  assert.equal(nvmrc, "24");
  assert.match(netlify, /NODE_VERSION = "24"/);
  assert.match(workflow, /node-version: 24/);
  assert.match(netlify, /X-Content-Type-Options = "nosniff"/);
  assert.match(netlify, /X-Frame-Options = "DENY"/);
  assert.match(netlify, /Referrer-Policy = "strict-origin-when-cross-origin"/);
  assert.match(netlify, /Permissions-Policy = "camera=\(\), microphone=\(\), geolocation=\(\)"/);
  assert.match(netlify, /Strict-Transport-Security = "max-age=31536000"/);
});
