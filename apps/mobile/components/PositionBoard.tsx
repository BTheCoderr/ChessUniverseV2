import * as Haptics from "expo-haptics";
import { ChessPiece, NATIVE_CHESS_PIECE_RATIO } from "@/components/ChessPiece";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Chess, type Square } from "chess.js";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

type Props = { fen: string; expectedMove: string; onCorrect: () => void; onWrong: () => void; locked?: boolean };

export function PositionBoard({ fen, expectedMove, onCorrect, onWrong, locked = false }: Props) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 44, 500);
  const [game, setGame] = useState(() => new Chess(fen));
  const [selected, setSelected] = useState<Square | null>(null);
  useEffect(() => { setGame(new Chess(fen)); setSelected(null); }, [fen]);
  const targets = useMemo(() => selected ? new Set(game.moves({ square: selected, verbose: true }).map((m) => m.to)) : new Set<Square>(), [game, selected]);

  const tap = (square: Square) => {
    if (locked) return;
    const piece = game.get(square);
    if (!selected) {
      if (piece?.color === game.turn()) { setSelected(square); void Haptics.selectionAsync(); }
      return;
    }
    if (piece?.color === game.turn()) { setSelected(square); return; }
    if (!targets.has(square)) { setSelected(null); onWrong(); return; }
    const uci = `${selected}${square}`;
    if (uci !== expectedMove) { setSelected(null); onWrong(); return; }
    const next = new Chess(fen);
    next.move({ from: selected, to: square, promotion: "q" });
    setGame(next); setSelected(null); onCorrect();
  };

  return <View style={[styles.board, { width: size, height: size }]}>{Array.from({ length: 8 }, (_, row) => 8 - row).flatMap((rank, row) => files.map((file, col) => {
    const square = `${file}${rank}` as Square;
    const piece = game.get(square);
    const dark = (row + col) % 2 === 1;
    const target = targets.has(square);
    return <Pressable key={square} onPress={() => tap(square)} style={[styles.square, { width: size / 8, height: size / 8 }, dark ? styles.dark : styles.light, selected === square && styles.active]}>
      {target && <View style={styles.target} />}
      {piece && <ChessPiece piece={piece} size={(size / 8) * NATIVE_CHESS_PIECE_RATIO} />}
    </Pressable>;
  }))}</View>;
}

const styles = StyleSheet.create({ board: { flexDirection: "row", flexWrap: "wrap", borderRadius: 14, overflow: "hidden", alignSelf: "center" }, square: { alignItems: "center", justifyContent: "center" }, light: { backgroundColor: "#E8DCC4" }, dark: { backgroundColor: "#526E8D" }, active: { backgroundColor: "#F2C064" }, target: { position: "absolute", width: 13, height: 13, borderRadius: 8, backgroundColor: "#08152D66" }, piece: { color: "#08152D", textAlign: "center" } });
