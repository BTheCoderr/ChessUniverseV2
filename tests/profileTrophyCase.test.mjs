import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("profile showcase returns only safe public progression data", async () => {
  const edge = await source("supabase/functions/online-game/index.ts");

  assert.match(edge, /action === "profile_showcase"/);
  assert.match(edge, /select\("id,username,rating,wins,losses,draws"\)/);
  assert.match(edge, /battle_player_stats/);
  assert.match(edge, /battle_formation_stats/);
  assert.match(edge, /universe_rewards/);
  assert.match(edge, /championshipWins/);
  assert.match(edge, /rewardKey:/);

  const showcaseBlock = edge.slice(
    edge.indexOf('if (action === "profile_showcase")'),
    edge.indexOf('if (action === "accept_rematch")')
  );

  assert.doesNotMatch(showcaseBlock, /session\.user\.email/);
  assert.doesNotMatch(showcaseBlock, /source_type/);
  assert.doesNotMatch(showcaseBlock, /source_id/);
  assert.doesNotMatch(showcaseBlock, /raw_user_meta_data/);
});

test("Trophy Case shows Battle record, favorite formation and progression rewards", async () => {
  const trophy = await source("src/components/ProfileTrophyCase.tsx");

  assert.match(trophy, /Trophy Case/);
  assert.match(trophy, /Battle Elo/);
  assert.match(trophy, /Battle W-L-D/);
  assert.match(trophy, /Favorite formation/);
  assert.match(trophy, /Championship/);
  assert.match(trophy, /champion_crown/);
  assert.match(trophy, /championship_crest/);
  assert.match(trophy, /universe_master_title/);
  assert.match(trophy, /season_contender/);
  assert.match(trophy, /season_challenger/);
});

test("account profile includes the player's own Trophy Case", async () => {
  const account = await source("src/components/AuthPanel.tsx");

  assert.match(account, /ProfileTrophyCase/);
  assert.match(account, /userId=\{session\.user\.id\}/);
});

test("leaderboard spotlight exposes another player's Trophy Case", async () => {
  const lobby = await source("src/components/OnlineLobby.tsx");

  assert.match(lobby, /ProfileTrophyCase/);
  assert.match(lobby, /userId=\{spotlightProfile\.id\}/);
  assert.match(lobby, /compact/);
});
