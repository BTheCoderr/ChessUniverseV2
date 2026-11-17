import { memo } from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import type { Color, PieceSymbol } from "chess.js";
import { CHESS_PIECE_ARTWORK } from "@/lib/chessPieceArtwork";

export type ChessPieceIdentity = { color: Color; type: PieceSymbol };

type Props = {
  piece: ChessPieceIdentity;
  /** Size in density-independent pixels; use the same ratio in every board. */
  size: number;
  testID?: string;
};

/**
 * Every iOS chess board (and promotion picker) renders this *same* 12-piece
 * vector set. The XML is generated from the web app's public/images/pieces.
 * It never asks iOS to substitute Unicode chess glyphs from different fonts.
 */
export const ChessPiece = memo(function ChessPiece({ piece, size, testID }: Props) {
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessible={false}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <SvgXml xml={CHESS_PIECE_ARTWORK[piece.color][piece.type]} width={size} height={size} />
    </View>
  );
});

export const NATIVE_CHESS_PIECE_RATIO = 0.88;
