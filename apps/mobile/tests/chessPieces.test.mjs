import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(mobile, "../..");
const read = (relative) => readFileSync(path.join(root, relative), "utf8");

test("all twelve mobile chess SVGs are generated from the exact website chess set", () => {
  execFileSync("node", ["scripts/sync-mobile-chess-pieces.mjs", "--check"], { cwd: root });
  const artwork = read("apps/mobile/lib/chessPieceArtwork.ts");
  for (const color of ["w", "b"]) {
    for (const piece of ["K", "Q", "R", "B", "N", "P"]) {
      const xml = read(`public/images/pieces/${color}${piece}.svg`).trim();
      assert.match(xml, /viewBox="0 0 45 45"/);
      assert.ok(artwork.includes(JSON.stringify(xml)),
        `Missing ${color}${piece} SVG from generated native artwork`);
    }
  }
});

test("Practice, Puzzle, Legends, Online, Replay and free-play render one shared vector component", () => {
  const boards = [
    "apps/mobile/components/ChessBoard.tsx",
    "apps/mobile/components/PositionBoard.tsx",
    "apps/mobile/components/PracticeGame.tsx",
    "apps/mobile/app/legends.tsx",
    "apps/mobile/app/online/[id].tsx",
    "apps/mobile/app/replay/[id].tsx",
  ];
  for (const file of boards) {
    const source = read(file);
    assert.match(source, /import \{ ChessPiece, NATIVE_CHESS_PIECE_RATIO \} from "@\/components\/ChessPiece"/,
      file + " should import the shared renderer");
    assert.match(source, /<ChessPiece\b/, file + " should render the shared pieces");
    assert.doesNotMatch(source, /[\u2654-\u265F]|\bglyphs\b/,
      file + " must not fall back to Unicode or alternate per-screen chess fonts");
    assert.match(source, /NATIVE_CHESS_PIECE_RATIO/, file + " must use shared sizing");
  }
  const practice = read("apps/mobile/components/PracticeGame.tsx");
  const online = read("apps/mobile/app/online/[id].tsx");
  assert.match(practice, /<ChessPiece piece=\{\{color:game\.turn\(\),type:p\}\}/);
  assert.match(online, /<ChessPiece piece=\{\{color:myColor\?\?"w",type:piece\}\}/);
});

test("native SVG chess piece sizes are consistent and independent of device font", () => {
  const renderer = read("apps/mobile/components/ChessPiece.tsx");
  assert.match(renderer, /<SvgXml xml=\{CHESS_PIECE_ARTWORK\[piece\.color\]\[piece\.type\]\}/);
  assert.match(renderer, /NATIVE_CHESS_PIECE_RATIO = 0\.88/);
  assert.doesNotMatch(renderer, /<Text|fontFamily|Platform\.OS/);
});
