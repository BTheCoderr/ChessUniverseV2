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

test("online lobby restores active games for either participant", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");
  assert.match(lobby, /\.in\("status", \["waiting", "active", "completed"\]\)/);
  assert.match(lobby, /game\.white_id === session\.user\.id \|\| game\.black_id === session\.user\.id/);
  assert.match(lobby, /\bResume\b/);
  assert.match(lobby, /Recent online games/);
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
  assert.ok(app.includes("<LocalGame onOpenLibrary="));
  assert.match(app, /<EvolvingQueensGame \/>/);
  assert.match(app, /<MagicHorseGame \/>/);
  assert.match(app, /<OnlineGame\\b/);
});
