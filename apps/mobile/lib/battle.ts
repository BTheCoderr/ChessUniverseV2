export type BattleFormation={key:string;name:string;backRank:string;description:string;requires:string|null};
export const battleFormations:BattleFormation[]=[
 {key:"classic",name:"Classic Line",backRank:"rnbqkbnr",description:"Traditional back rank with Chess Universe's Black-first opening.",requires:null},
 {key:"cavalry",name:"Cavalry Wing",backRank:"rnnqkbbr",description:"Knights stack toward the queen side for faster fork pressure.",requires:"back_rank_lab"},
 {key:"fortress",name:"Fortress",backRank:"rbnqknbr",description:"Bishops and knights trade lanes to build a tighter defensive shell.",requires:"back_rank_lab"},
 {key:"crest_guard",name:"Crest Guard",backRank:"nrbqkbrn",description:"Championship-qualified formation with knights on the corners.",requires:"championship_crest"},
 {key:"crown_wall",name:"Crown Wall",backRank:"qrbnknbr",description:"Champion formation with the queen on the edge and rooks inside.",requires:"champion_crown"},
 {key:"master_grid",name:"Master Grid",backRank:"bnrqkrnb",description:"Universe Master formation with central rooks and split bishops.",requires:"universe_master_title"},
];
