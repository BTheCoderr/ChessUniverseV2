import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseQueenMove, SEARCH_LIMITS } from '../src/lib/queenAi.ts';
import { newPosition, playMove, legalMoves, applyLegalMove, inCheck } from '../src/lib/evolvingQueens.ts';

function fixture(pieces) {
  const p = { ...newPosition(), board: Array(64).fill(null), turn: 'w', castling: '' };
  for (const [s, type, color] of pieces) p.board[(8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0])] = { type, color };
  return p;
}

test('starting board has exactly 32 valid pieces and empty middle ranks', () => {
  const p = newPosition();
  assert.equal(p.board.filter(Boolean).length, 32);
  assert.ok(p.board.slice(16, 48).every(piece => piece === null));
  assert.equal(legalMoves(p, 1).length, 20);
});

test('every AI difficulty returns a legal reply at every queen level', () => {
  for (const level of [1, 2, 3, 4]) {
    const position = playMove(newPosition(), level, 'e7', 'e5');
    const unchanged = JSON.stringify(position);
    for (const difficulty of ['easy', 'medium', 'hard']) {
      const move = chooseQueenMove(position, level, difficulty);
      assert.ok(legalMoves(position, level).some(m => m.from === move.from && m.to === move.to));
      assert.equal(inCheck(applyLegalMove(position, move), 'w', level), false);
    }
    assert.equal(JSON.stringify(position), unchanged);
  }
  assert.ok(SEARCH_LIMITS.hard.depth > SEARCH_LIMITS.medium.depth);
  assert.ok(SEARCH_LIMITS.medium.depth > SEARCH_LIMITS.easy.depth);
});

test('AI uses queen knight captures under evolved rules only', () => {
  const p = fixture([['a1', 'k', 'w'], ['h7', 'k', 'b'], ['d4', 'q', 'w'], ['e6', 'q', 'b']]);
  for (const level of [2, 3, 4]) {
    const move = chooseQueenMove(p, level, 'easy');
    assert.equal(move.from, 'd4');
    assert.equal(move.to, 'e6');
  }
  assert.notEqual(chooseQueenMove(p, 1, 'easy').to, 'e6');
});

test('AI does not move after mate or the fifty-move draw', () => {
  const mate = fixture([['a1', 'k', 'w'], ['c3', 'k', 'b'], ['b2', 'q', 'b']]);
  assert.equal(chooseQueenMove(mate, 4, 'hard'), null);
  const draw = { ...newPosition(), halfmoves: 100 };
  assert.equal(chooseQueenMove(draw, 4, 'hard'), null);
});
