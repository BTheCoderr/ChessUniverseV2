import type { Square } from "chess.js";

export type Color = "w" | "b";
export type Piece = { type: "p" | "n" | "b" | "r" | "q" | "k"; color: Color };
export type QueenLevel = 1 | 2 | 3 | 4;
export type Move = { from: Square; to: Square; promotion?: "q"; castle?: boolean; enPassant?: boolean };
export type Position = {
  board: (Piece | null)[];
  turn: Color;
  castling: string;
  enPassant: Square | null;
  halfmoves: number;
  fullmoves: number;
};

const files = "abcdefgh";
const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
const knightSteps = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const straight = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const diagonal = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const kingSteps = [...straight, ...diagonal];
const other = (color: Color): Color => color === "w" ? "b" : "w";
const index = (square: Square) => (8 - Number(square[1])) * 8 + files.indexOf(square[0]);
const squareAt = (file: number, rank: number): Square => `${files[file]}${8 - rank}` as Square;
const inside = (file: number, rank: number) => file >= 0 && file < 8 && rank >= 0 && rank < 8;

export function newPosition(): Position {
  const board: (Piece | null)[] = Array(64).fill(null);
  start.split("/").forEach((row, rank) => {
    [...row].forEach((char, file) => {
      board[rank * 8 + file] = { type: char.toLowerCase() as Piece["type"], color: char === char.toUpperCase() ? "w" : "b" };
    });
  });
  return { board, turn: "b", castling: "KQkq", enPassant: null, halfmoves: 0, fullmoves: 1 };
}

export function pieceAt(position: Position, square: Square): Piece | null {
  return position.board[index(square)];
}

function queenRays(level: QueenLevel): number[][] {
  if (level === 2) return diagonal;
  if (level === 3) return straight;
  return kingSteps;
}

function attacks(position: Position, from: Square, target: Square, level: QueenLevel): boolean {
  const piece = pieceAt(position, from);
  if (!piece) return false;
  const fx = files.indexOf(from[0]), fy = 8 - Number(from[1]);
  const tx = files.indexOf(target[0]), ty = 8 - Number(target[1]);
  const dx = tx - fx, dy = ty - fy;
  if (piece.type === "p") return Math.abs(dx) === 1 && dy === (piece.color === "w" ? -1 : 1);
  if (piece.type === "n") return knightSteps.some(([x, y]) => x === dx && y === dy);
  if (piece.type === "k") return Math.max(Math.abs(dx), Math.abs(dy)) === 1;
  if (piece.type === "q" && level > 1 && (knightSteps.some(([x, y]) => x === dx && y === dy) || Math.max(Math.abs(dx), Math.abs(dy)) === 1)) return true;
  const directions = piece.type === "b" ? diagonal : piece.type === "r" ? straight : piece.type === "q" ? queenRays(level) : [];
  const direction = directions.find(([x, y]) => {
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    return distance > 0 && dx === x * distance && dy === y * distance;
  });
  if (!direction) return false;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  for (let step = 1; step < distance; step++) {
    if (pieceAt(position, squareAt(fx + direction[0] * step, fy + direction[1] * step))) return false;
  }
  return true;
}

export function isAttacked(position: Position, square: Square, by: Color, level: QueenLevel): boolean {
  return position.board.some((piece, i) => piece?.color === by && attacks(position, squareAt(i % 8, Math.floor(i / 8)), square, level));
}

export function inCheck(position: Position, color: Color, level: QueenLevel): boolean {
  const kingIndex = position.board.findIndex((piece) => piece?.type === "k" && piece.color === color);
  return kingIndex < 0 || isAttacked(position, squareAt(kingIndex % 8, Math.floor(kingIndex / 8)), other(color), level);
}

function candidateMoves(position: Position, from: Square, level: QueenLevel): Move[] {
  const piece = pieceAt(position, from);
  if (!piece || piece.color !== position.turn) return [];
  const fx = files.indexOf(from[0]), fy = 8 - Number(from[1]);
  const moves: Move[] = [];
  const add = (x: number, y: number, special: Partial<Move> = {}) => {
    if (!inside(x, y)) return;
    const to = squareAt(x, y);
    const target = pieceAt(position, to);
    if (target?.color === piece.color || target?.type === "k") return;
    moves.push({ from, to, ...(piece.type === "p" && (y === 0 || y === 7) ? { promotion: "q" as const } : {}), ...special });
  };
  if (piece.type === "p") {
    const step = piece.color === "w" ? -1 : 1;
    if (inside(fx, fy + step) && !pieceAt(position, squareAt(fx, fy + step))) {
      add(fx, fy + step);
      if (fy === (piece.color === "w" ? 6 : 1) && !pieceAt(position, squareAt(fx, fy + step * 2))) add(fx, fy + step * 2);
    }
    for (const x of [fx - 1, fx + 1]) {
      if (!inside(x, fy + step)) continue;
      const to = squareAt(x, fy + step);
      if (pieceAt(position, to)?.color === other(piece.color)) add(x, fy + step);
      else if (position.enPassant === to && pieceAt(position, squareAt(x, fy))?.type === "p" && pieceAt(position, squareAt(x, fy))?.color === other(piece.color)) add(x, fy + step, { enPassant: true });
    }
  } else if (piece.type === "n" || piece.type === "k") {
    for (const [x, y] of piece.type === "n" ? knightSteps : kingSteps) add(fx + x, fy + y);
  } else {
    const directions = piece.type === "b" ? diagonal : piece.type === "r" ? straight : queenRays(level);
    for (const [x, y] of directions) {
      for (let step = 1; inside(fx + x * step, fy + y * step); step++) {
        const to = squareAt(fx + x * step, fy + y * step);
        const target = pieceAt(position, to);
        if (target?.color === piece.color || target?.type === "k") break;
        add(fx + x * step, fy + y * step);
        if (target) break;
      }
    }
    if (piece.type === "q" && level > 1) {
      for (const [x, y] of [...knightSteps, ...kingSteps]) {
        if (Math.max(Math.abs(x), Math.abs(y)) === 1 && directions.some(([rx, ry]) => rx === x && ry === y)) continue;
        add(fx + x, fy + y);
      }
    }
  }
  if (piece.type === "k" && from === (piece.color === "w" ? "e1" : "e8") && !inCheck(position, piece.color, level)) {
    const rank = piece.color === "w" ? "1" : "8";
    for (const [flag, rook, between, transit, destination] of [
      [piece.color === "w" ? "K" : "k", `h${rank}`, [`f${rank}`, `g${rank}`], `f${rank}`, `g${rank}`],
      [piece.color === "w" ? "Q" : "q", `a${rank}`, [`d${rank}`, `c${rank}`, `b${rank}`], `d${rank}`, `c${rank}`],
    ] as const) {
      if (position.castling.includes(flag) && pieceAt(position, rook as Square)?.type === "r" && pieceAt(position, rook as Square)?.color === piece.color &&
        between.every((s) => !pieceAt(position, s as Square)) && !isAttacked(position, transit as Square, other(piece.color), level) &&
        !isAttacked(position, destination as Square, other(piece.color), level)) {
        moves.push({ from, to: destination as Square, castle: true });
      }
    }
  }
  return moves;
}

function apply(position: Position, move: Move): Position {
  const board = [...position.board];
  const piece = board[index(move.from)]!;
  const captured = board[index(move.to)];
  board[index(move.from)] = null;
  board[index(move.to)] = move.promotion ? { color: piece.color, type: move.promotion } : piece;
  if (move.enPassant) board[index(`${move.to[0]}${move.from[1]}` as Square)] = null;
  if (move.castle) {
    const rank = move.from[1];
    const kingSide = move.to[0] === "g";
    const rookFrom = `${kingSide ? "h" : "a"}${rank}` as Square;
    const rookTo = `${kingSide ? "f" : "d"}${rank}` as Square;
    board[index(rookTo)] = board[index(rookFrom)];
    board[index(rookFrom)] = null;
  }
  let castling = position.castling;
  if (piece.type === "k") castling = castling.replace(piece.color === "w" ? /[KQ]/g : /[kq]/g, "");
  for (const [square, flag] of [["a1", "Q"], ["h1", "K"], ["a8", "q"], ["h8", "k"]]) {
    if (move.from === square || move.to === square) castling = castling.replace(flag, "");
  }
  const fromRank = 8 - Number(move.from[1]);
  const toRank = 8 - Number(move.to[1]);
  return {
    board, turn: other(position.turn), castling,
    enPassant: piece.type === "p" && Math.abs(toRank - fromRank) === 2 ? squareAt(files.indexOf(move.from[0]), (fromRank + toRank) / 2) : null,
    halfmoves: piece.type === "p" || captured || move.enPassant ? 0 : position.halfmoves + 1,
    fullmoves: position.fullmoves + (position.turn === "w" ? 1 : 0),
  };
}

export function legalMoves(position: Position, level: QueenLevel, from?: Square): Move[] {
  const sources = from ? [from] : position.board.flatMap((piece, i) => piece?.color === position.turn ? [squareAt(i % 8, Math.floor(i / 8))] : []);
  return sources.flatMap((source) => candidateMoves(position, source, level).filter((move) => !inCheck(apply(position, move), position.turn, level)));
}

export function playMove(position: Position, level: QueenLevel, from: Square, to: Square): Position | null {
  const move = legalMoves(position, level, from).find((option) => option.to === to);
  return move ? apply(position, move) : null;
}

export function gameStatus(position: Position, level: QueenLevel): string {
  const color = position.turn === "w" ? "White" : "Black";
  const check = inCheck(position, position.turn, level);
  if (legalMoves(position, level).length === 0) return check ? `Checkmate — ${position.turn === "w" ? "Black" : "White"} wins` : "Draw — stalemate";
  if (position.halfmoves >= 100) return "Draw — fifty moves without a capture or pawn move";
  return `${color} to move${check ? " — check" : ""}`;
}
