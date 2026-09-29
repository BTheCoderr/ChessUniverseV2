import test from "node:test";
import assert from "node:assert/strict";
import { FAMOUS_GAMES, famousGameHistory, famousPosition } from "../src/lib/famousGames.ts";

function normalize(san) {
  return san.replace(/[+#]/g, "");
}

test("all curated historical games parse and reach their recorded finish", () => {
  assert.equal(FAMOUS_GAMES.length, 3);

  for (const game of FAMOUS_GAMES) {
    const history = famousGameHistory(game);
    assert.ok(history.length > game.criticalPly, `${game.title} has a critical move`);
    const finalPosition = famousPosition(game, history.length);
    assert.equal(finalPosition.isCheckmate(), true, `${game.title} ends in checkmate`);
  }
});

test("each Rewrite History scenario begins immediately before the famous move", () => {
  for (const game of FAMOUS_GAMES) {
    const history = famousGameHistory(game);
    const historical = history[game.criticalPly];
    assert.ok(historical, `${game.title} historical move exists`);
    assert.equal(
      normalize(historical.san),
      normalize(game.historicalMove),
      `${game.title} critical move is pinned to the verified score`
    );

    const before = famousPosition(game, game.criticalPly);
    assert.equal(before.turn(), historical.color);
  }
});

test("historical replay uses normal White-first chess rather than Universe turn order", () => {
  for (const game of FAMOUS_GAMES) {
    const start = famousPosition(game, 0);
    assert.equal(start.turn(), "w");
  }
});
