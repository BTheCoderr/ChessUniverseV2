import { Chess } from "chess.js";

export type BattleFormation = {
  key: string;
  name: string;
  backRank: string;
  description: string;
  requires: string | null;
};

export const BATTLE_FORMATIONS: BattleFormation[] = [
  {
    key: "classic",
    name: "Classic Line",
    backRank: "rnbqkbnr",
    description: "Traditional back rank with Chess Universe's Black-first opening.",
    requires: null,
  },
  {
    key: "cavalry",
    name: "Cavalry Wing",
    backRank: "rnnqkbbr",
    description: "Knights stack toward the queen side for faster fork pressure.",
    requires: "back_rank_lab",
  },
  {
    key: "fortress",
    name: "Fortress",
    backRank: "rbnqknbr",
    description: "Bishops and knights trade lanes to build a tighter defensive shell.",
    requires: "back_rank_lab",
  },
  {
    key: "crest_guard",
    name: "Crest Guard",
    backRank: "nrbqkbrn",
    description: "A Championship-qualified formation with knights posted on the corners.",
    requires: "championship_crest",
  },
  {
    key: "crown_wall",
    name: "Crown Wall",
    backRank: "qrbnknbr",
    description: "Champion-only formation that puts the queen on the edge and rooks inside.",
    requires: "champion_crown",
  },
  {
    key: "master_grid",
    name: "Master Grid",
    backRank: "bnrqkrnb",
    description: "Universe Master formation with central rooks and split bishops.",
    requires: "universe_master_title",
  },
];

export function formationFen(formation: BattleFormation) {
  const black = formation.backRank;
  const white = formation.backRank.toUpperCase();
  return `${black}/pppppppp/8/8/8/8/PPPPPPPP/${white} b - - 0 1`;
}

export function newBattleChessGame(formation: BattleFormation) {
  return new Chess(formationFen(formation));
}

export function unlockedBattleFormations(unlocks: Set<string>) {
  return BATTLE_FORMATIONS.filter(
    (formation) => !formation.requires || unlocks.has(formation.requires)
  );
}
