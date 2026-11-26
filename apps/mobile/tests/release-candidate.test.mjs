import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { matchExpectedMove } from "../lib/puzzleMove.ts";
import { BATTLE_START_FENS as nativeBattle, BLACK_FIRST_FEN as nativeBlackFirst, replayStartFen } from "../lib/replayStart.ts";
import { squareAccessibilityLabel, squareTestId } from "../lib/boardA11y.ts";
import { validateAuthInput } from "../lib/authValidation.ts";
import { BATTLE_START_FENS as serverBattle, BLACK_FIRST_FEN as serverBlackFirst } from "../../../supabase/functions/online-game/rules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("promotion puzzle solutions (a7a8q) match a tapped a7→a8 move", () => {
  assert.deepEqual(matchExpectedMove("a7", "a8", "a7a8q"), { ok: true, promotion: "q" });
  assert.deepEqual(matchExpectedMove("b7", "b8", "b7b8n"), { ok: true, promotion: "n" });
  assert.equal(matchExpectedMove("d1", "d8", "d1d8").ok, true);
  assert.equal(matchExpectedMove("d1", "d7", "d1d8").ok, false);
  assert.match(read("components/PositionBoard.tsx"), /matchExpectedMove\(selected, square, expectedMove\)/);
  assert.doesNotMatch(read("components/PositionBoard.tsx"), /uci !== expectedMove/);
});

test("My Games replay starts from the server's Black-first or Battle formation position", () => {
  assert.equal(nativeBlackFirst, serverBlackFirst);
  assert.deepEqual({ ...nativeBattle }, { ...serverBattle });
  assert.equal(replayStartFen({ variant: "traditional" }), serverBlackFirst);
  assert.equal(replayStartFen({ variant: "battle", battle_formation_key: "fortress" }), serverBattle.fortress);
  assert.equal(replayStartFen({ variant: "battle", battle_formation_key: "unknown" }), serverBattle.classic);
  assert.equal(replayStartFen(null).split(" ")[1], "b");
  const replay = read("app/replay/[id].tsx");
  assert.match(replay, /replayStartFen\(/);
  assert.doesNotMatch(replay, /step===0\?new Chess\(\)/);
});

test("board squares expose VoiceOver labels and stable test IDs", () => {
  assert.equal(squareAccessibilityLabel("e4", { color: "w", type: "n" }, { selected: true }), "e4, White knight, selected");
  assert.equal(squareAccessibilityLabel("d5", null, { target: true }), "d5, empty, legal move");
  assert.equal(squareAccessibilityLabel("f7", { color: "b", type: "p" }, { target: true }), "f7, Black pawn, capture available");
  assert.equal(squareTestId("h8"), "square-h8");
  for (const file of ["components/PracticeGame.tsx", "components/PositionBoard.tsx", "app/online/[id].tsx"]) {
    const code = read(file);
    assert.match(code, /testID=\{squareTestId\((?:sq|square)\)\}/, `${file} squares need test IDs`);
    assert.match(code, /accessibilityLabel=\{squareAccessibilityLabel\(/, `${file} squares need labels`);
  }
});

test("every screen's back button is labeled for VoiceOver", () => {
  const dir = path.join(root, "app");
  const files = readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith(".tsx")).map((f) => path.join("app", String(f)));
  for (const file of files) {
    const code = read(file);
    const backs = code.match(/<Pressable[^>]*router\.back\(\)[^>]*>/g) ?? [];
    for (const tag of backs) assert.match(tag, /accessibilityLabel="Back"/, `${file} has an unlabeled back button`);
  }
});

test("online match and lobby re-sync after reconnecting or returning to the foreground", () => {
  const match = read("app/online/[id].tsx");
  assert.match(match, /AppState\.addEventListener\("change"/);
  assert.match(match, /status==="SUBSCRIBED"\)\{[\s\S]{0,120}void load\(\)/);
  assert.match(read("app/online.tsx"), /AppState\.addEventListener\("change"/);
});

test("sign-in and sign-up validate input before calling Supabase", () => {
  assert.equal(validateAuthInput("signin", "bad", "secret1"), "Enter a valid email address.");
  assert.equal(validateAuthInput("signin", " a@b.co ", "12345"), "Password must be at least 6 characters.");
  assert.equal(validateAuthInput("signup", "a@b.co", "secret1", "ab"), "Username must be 3 to 24 characters.");
  assert.equal(validateAuthInput("signup", "a@b.co", "secret1", "knight"), null);
  assert.equal(validateAuthInput("forgot", "a@b.co", ""), null);
  const account = read("app/account.tsx");
  assert.match(account, /validateAuthInput\(mode,email,password,username\)/);
  assert.doesNotMatch(account, /Supabase URL and publishable key/, "reviewers must not see developer setup copy");
});

test("EAS production builds fail fast without the public Supabase environment", async () => {
  const config = read("app.config.ts");
  assert.match(config, /assertReleaseEnvironment\(\);/);
  assert.match(config, /EAS_BUILD_PROFILE !== "production"/);
  assert.match(config, /EXPO_PUBLIC_SUPABASE_URL/);
  assert.match(config, /EXPO_PUBLIC_SUPABASE_ANON_KEY/);
});

test("solving a puzzle keeps the explanation and the solved position on screen", () => {
  // Found by the Maestro simulator run: saving progress re-ran an effect that
  // cleared the feedback, and a solved-keyed remount reset the board.
  const code = read("app/puzzles.tsx");
  assert.doesNotMatch(code, /\[index,puzzle\.id,progress\]/);
  assert.match(code, /setFeedback\(null\);setShowHint\(false\)\},\[index\]\)/);
  assert.match(code, /<PositionBoard key=\{puzzle\.id\}/);
});

test("practice status is rendered above the board so it is visible with clocks on", () => {
  const code = read("components/PracticeGame.tsx");
  assert.ok(code.indexOf('testID="practice-status"') < code.indexOf("styles.board,{width:size"), "status must precede the board");
});
