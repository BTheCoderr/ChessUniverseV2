import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { gameStatus, legalMoves, playMove } from "@/lib/chess";

const glyphs: Record<Color, Record<PieceSymbol, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};
const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export function ChessBoard() {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 28, 520);
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState<Square | null>(null);
  const targets = useMemo(() => selected ? new Set(legalMoves(game, selected).map((m) => m.to)) : new Set<Square>(), [game, selected]);
  const status = gameStatus(game);
  const history = game.history({ verbose: true });
  const captured = history.filter((move) => move.captured);

  const tap = (square: Square) => {
    const piece = game.get(square);
    if (!selected) {
      if (piece?.color === game.turn()) {
        setSelected(square);
        void Haptics.selectionAsync();
      }
      return;
    }
    if (piece?.color === game.turn()) {
      setSelected(square);
      void Haptics.selectionAsync();
      return;
    }
    if (!targets.has(square)) {
      setSelected(null);
      return;
    }
    const next = new Chess(game.fen());
    const move = playMove(next, { from: selected, to: square });
    if (move) {
      const pgnBefore = game.pgn();
      if (pgnBefore) {
        const replay = new Chess();
        replay.loadPgn(pgnBefore);
        replay.move({ from: selected, to: square, promotion: "q" });
        setGame(replay);
      } else setGame(next);
      setSelected(null);
      void Haptics.impactAsync(move.captured ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const reset = () => { setGame(new Chess()); setSelected(null); };
  const undo = () => {
    if (!history.length) return;
    const next = new Chess();
    const moves = game.history();
    moves.slice(0, -1).forEach((san) => next.move(san));
    setGame(next);
    setSelected(null);
    void Haptics.selectionAsync();
  };

  return (
    <View>
      <View style={[styles.board, { width: size, height: size }]}>
        {Array.from({ length: 8 }, (_, row) => 8 - row).flatMap((rank, row) => files.map((file, col) => {
          const square = `${file}${rank}` as Square;
          const piece = game.get(square);
          const dark = (row + col) % 2 === 1;
          const active = selected === square;
          const target = targets.has(square);
          return (
            <Pressable key={square} onPress={() => tap(square)} style={[styles.square, { width: size / 8, height: size / 8 }, dark ? styles.dark : styles.light, active && styles.active]}>
              {target && <View style={styles.target} />}
              {piece && <Text style={[styles.piece, { fontSize: size / 11.5 }]}>{glyphs[piece.color][piece.type]}</Text>}
            </Pressable>
          );
        }))}
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.status}>{status === "playing" ? `${game.turn() === "w" ? "White" : "Black"} to move` : status.toUpperCase()}</Text>
        <View style={styles.actions}>
          <Pressable disabled={!history.length} onPress={undo}><Text style={[styles.action, !history.length && styles.disabled]}>Undo</Text></Pressable>
          <Pressable onPress={reset}><Text style={styles.action}>New game</Text></Pressable>
        </View>
      </View>

      {!!captured.length && <Text style={styles.captures}>Captured  {captured.map((m) => m.captured ? glyphs[m.color === "w" ? "b" : "w"][m.captured] : "").join(" ")}</Text>}

      {!!history.length && (
        <View style={styles.historyPanel}>
          <Text style={styles.historyLabel}>MOVES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
            {history.map((move, index) => <Text key={`${move.before}-${index}`} style={styles.move}>{index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ""}{move.san}</Text>)}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: "row", flexWrap: "wrap", borderRadius: 12, overflow: "hidden", alignSelf: "center" },
  square: { alignItems: "center", justifyContent: "center" },
  light: { backgroundColor: "#d9ded5" },
  dark: { backgroundColor: "#65736b" },
  active: { backgroundColor: "#d7ff4a" },
  target: { position: "absolute", width: 13, height: 13, borderRadius: 8, backgroundColor: "#0b0e0f66" },
  piece: { color: "#0b0e0f", textAlign: "center" },
  statusRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, alignItems: "center" },
  status: { color: "#f5f7f0", fontSize: 15, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 16 },
  action: { color: "#d7ff4a", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.3 },
  captures: { color: "#9ca7a3", fontSize: 18, marginTop: 12 },
  historyPanel: { backgroundColor: "#151a1b", borderRadius: 14, padding: 12, marginTop: 12 },
  historyLabel: { color: "#71807a", fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  historyScroll: { gap: 10, paddingTop: 7, paddingRight: 10 },
  move: { color: "#e5e9e2", fontSize: 13, fontWeight: "700" },
});
