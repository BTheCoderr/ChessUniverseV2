import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { aiLevels, chooseAiMove, type AiLevel } from "@/lib/ai";

const glyphs: Record<Color, Record<PieceSymbol, string>> = { w: { k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙" }, b: { k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟" } };
const files = ["a","b","c","d","e","f","g","h"] as const;

export function PracticeGame() {
  const { width } = useWindowDimensions(); const size = Math.min(width - 28, 520);
  const [game, setGame] = useState(() => new Chess()); const [selected, setSelected] = useState<Square|null>(null);
  const [level, setLevel] = useState<AiLevel>("beginner"); const [thinking, setThinking] = useState(false); const timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const targets = useMemo(() => selected ? new Set(game.moves({square:selected,verbose:true}).map(m=>m.to)) : new Set<Square>(), [game,selected]);
  const current = aiLevels.find(x=>x.id===level)!;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const playAi = (position: Chess) => { if (position.isGameOver()) return; setThinking(true); timer.current=setTimeout(()=>{ const next=new Chess(); next.loadPgn(position.pgn()); const move=chooseAiMove(next,level); if(move) next.move(move); setGame(next); setThinking(false); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }, current.delay); };
  const tap=(sq:Square)=>{ if(thinking||game.turn()!=="w"||game.isGameOver())return; const piece=game.get(sq); if(!selected){if(piece?.color==="w")setSelected(sq);return;} if(piece?.color==="w"){setSelected(sq);return;} if(!targets.has(sq)){setSelected(null);return;} const next=new Chess(); next.loadPgn(game.pgn()); try{next.move({from:selected,to:sq,promotion:"q"});setGame(next);setSelected(null);void Haptics.selectionAsync();playAi(next);}catch{setSelected(null);} };
  const reset=()=>{if(timer.current)clearTimeout(timer.current);setThinking(false);setSelected(null);setGame(new Chess());};
  const undoRound=()=>{if(thinking||game.history().length<2)return;const sans=game.history().slice(0,-2);const next=new Chess();sans.forEach(s=>next.move(s));setGame(next);setSelected(null);};

  return <View>
    <Text style={styles.label}>AI LEVEL</Text><View style={styles.levels}>{aiLevels.map(item=><Pressable key={item.id} onPress={()=>{setLevel(item.id);reset();}} style={[styles.level,item.id===level&&styles.levelActive]}><Text style={[styles.levelText,item.id===level&&styles.levelTextActive]}>{item.label}</Text></Pressable>)}</View>
    <Text style={styles.description}>{current.description}</Text>
    <View style={[styles.board,{width:size,height:size}]}>{Array.from({length:8},(_,row)=>8-row).flatMap((rank,row)=>files.map((file,col)=>{const sq=`${file}${rank}` as Square;const piece=game.get(sq);const dark=(row+col)%2===1;const target=targets.has(sq);const last=game.history({verbose:true}).at(-1);const lastSquare=last&&(last.from===sq||last.to===sq);const checked=game.inCheck()&&piece?.type==="k"&&piece.color===game.turn();return <Pressable key={sq} onPress={()=>tap(sq)} style={[styles.square,{width:size/8,height:size/8},dark?styles.dark:styles.light,lastSquare&&styles.last,checked&&styles.check,selected===sq&&styles.active]}>{target&&<View style={styles.target}/>} {piece&&<Text style={[styles.piece,{fontSize:size/11.5}]}>{glyphs[piece.color][piece.type]}</Text>}</Pressable>}))}</View>
    <View style={styles.footer}><Text style={styles.status}>{game.isCheckmate()?"Checkmate":game.isDraw()?"Draw":thinking?`${current.label} is thinking…`:game.inCheck()?"Check — your move":"Your move"}</Text><View style={styles.actions}><Pressable onPress={undoRound}><Text style={styles.action}>Undo round</Text></Pressable><Pressable onPress={reset}><Text style={styles.action}>New</Text></Pressable></View></View>
  </View>;
}
const styles=StyleSheet.create({label:{color:"#71807a",fontSize:10,fontWeight:"900",letterSpacing:1.5},levels:{flexDirection:"row",gap:7,marginTop:8,marginBottom:7},level:{flex:1,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:"#293332",alignItems:"center"},levelActive:{backgroundColor:"#d7ff4a",borderColor:"#d7ff4a"},levelText:{color:"#9ca7a3",fontSize:11,fontWeight:"800"},levelTextActive:{color:"#0b0e0f"},description:{color:"#74807c",fontSize:12,marginBottom:15},board:{flexDirection:"row",flexWrap:"wrap",borderRadius:12,overflow:"hidden",alignSelf:"center"},square:{alignItems:"center",justifyContent:"center"},light:{backgroundColor:"#d9ded5"},dark:{backgroundColor:"#65736b"},active:{backgroundColor:"#d7ff4a"},last:{borderWidth:3,borderColor:"#d7ff4a99"},check:{backgroundColor:"#d46a5c"},target:{position:"absolute",width:13,height:13,borderRadius:8,backgroundColor:"#0b0e0f66"},piece:{color:"#0b0e0f"},footer:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:14},status:{color:"#f5f7f0",fontSize:14,fontWeight:"800"},actions:{flexDirection:"row",gap:14},action:{color:"#d7ff4a",fontSize:13,fontWeight:"800"}});
