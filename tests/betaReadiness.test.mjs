import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("password recovery is wired through Supabase and routes recovery links to Account", async () => {
  const auth = await source("src/components/AuthPanel.tsx");
  const app = await source("src/App.tsx");

  assert.match(auth, /resetPasswordForEmail/);
  assert.match(auth, /updateUser\(\{ password: newPassword \}\)/);
  assert.match(auth, /Forgot password\?/);
  assert.match(app, /event === "PASSWORD_RECOVERY"/);
  assert.match(app, /setView\("account"\)/);
});

test("account deletion is authenticated, server-side, and clears local player data", async () => {
  const auth = await source("src/components/AuthPanel.tsx");
  const edge = await source("supabase/functions/delete-account/index.ts");

  assert.match(auth, /functions\.invoke\("delete-account"/);
  assert.match(auth, /deleteConfirm !== "DELETE"/);
  assert.match(auth, /clearLocalPlayerData/);
  assert.match(edge, /userClient\.auth\.getUser\(\)/);
  assert.match(edge, /admin\.auth\.admin\.deleteUser\(user\.id\)/);
  assert.match(edge, /\.neq\("status", "completed"\)/);
});

test("completed history survives account deletion while unfinished games are removable", async () => {
  const migration = await source("supabase/migrations/013_beta_readiness.sql");

  assert.match(migration, /alter column white_id drop not null/);
  assert.match(migration, /games_white_id_fkey[\s\S]*on delete set null/);
  assert.match(migration, /alter column player_id drop not null/);
  assert.match(migration, /game_moves_player_id_fkey[\s\S]*on delete set null/);
});

test("beta feedback keeps owner-scoped Supabase storage plus a public Netlify fallback", async () => {
  const migration = await source("supabase/migrations/013_beta_readiness.sql");
  const panel = await source("src/components/FeedbackPanel.tsx");
  const types = await source("src/lib/database.types.ts");

  assert.match(migration, /create table if not exists public\.beta_feedback/);
  assert.match(migration, /alter table public\.beta_feedback enable row level security/);
  assert.match(migration, /grant insert on table public\.beta_feedback to authenticated/);
  assert.match(migration, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(panel, /from\("beta_feedback"\)\.insert/);
  assert.match(panel, /submitNetlifyFeedback/);
  assert.match(panel, /No sign-in required/);
  assert.match(types, /beta_feedback:/);

  const html = await source("index.html");
  const netlifyFeedback = await source("src/lib/netlifyFeedback.ts");
  assert.match(html, /name="chess-universe-feedback"/);
  assert.match(html, /data-netlify="true"/);
  assert.match(html, /netlify-honeypot="bot-field"/);
  assert.match(netlifyFeedback, /form-name/);
  assert.match(netlifyFeedback, /application\/x-www-form-urlencoded/);
});

test("lobby create and join guards stop one player from flooding the beta", async () => {
  const migration = await source("supabase/migrations/013_beta_readiness.sql");

  assert.match(migration, /where white_id = actor_id[\s\S]*and status = 'waiting'/);
  assert.match(migration, /Resume or finish your active game before creating another/);
  assert.match(migration, /Resume or finish your current game before joining another/);
});

test("local player data is separated when accounts switch on a shared browser", async () => {
  const local = await source("src/lib/localPlayerData.ts");
  const app = await source("src/App.tsx");

  assert.match(local, /LOCAL_PLAYER_OWNER_KEY/);
  assert.match(local, /owner && owner !== userId/);
  assert.match(local, /GAME_LIBRARY_KEY/);
  assert.match(local, /HISTORY_PROGRESS_KEY/);
  assert.match(local, /PUZZLE_PROGRESS_KEY/);
  assert.match(app, /prepareLocalDataForUser/);
  assert.match(app, /if \(switchedAccounts\)/);
});

test("beta release surfaces include privacy, terms, feedback, and crash recovery", async () => {
  const app = await source("src/App.tsx");
  const legal = await source("src/components/LegalPage.tsx");
  const main = await source("src/main.tsx");

  assert.match(app, /"feedback"/);
  assert.match(app, /"privacy"/);
  assert.match(app, /"terms"/);
  assert.match(app, /Chess Universe Beta/);
  assert.match(legal, /Completed match[\s\S]*de-identified/);
  assert.match(legal, /No real-money wagering/);
  assert.match(main, /<ErrorBoundary>/);
});
