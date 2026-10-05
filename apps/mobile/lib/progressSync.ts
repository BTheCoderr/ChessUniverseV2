import type { Session } from "@supabase/supabase-js";
import { readJson,writeJson } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

export type PuzzleProgress={id:string;solvedAt:string;attempts:number};
type RemoteProgress={puzzle_progress:unknown;preferences:unknown};
type Preferences={mobileAcademyComplete?:string[];[key:string]:unknown};

const ACADEMY_KEY="academy-complete-v1";
const PUZZLE_KEY="puzzle-progress-v1";

function strings(value:unknown){return Array.isArray(value)?value.filter((v):v is string=>typeof v==="string"):[]}
function puzzleRows(value:unknown):PuzzleProgress[]{if(!Array.isArray(value))return[];return value.flatMap(v=>{if(!v||typeof v!=="object")return[];const r=v as Record<string,unknown>;if(typeof r.id!=="string")return[];return[{id:r.id,solvedAt:typeof r.solvedAt==="string"?r.solvedAt:new Date(0).toISOString(),attempts:typeof r.attempts==="number"?r.attempts:1}]})}
function mergePuzzles(a:PuzzleProgress[],b:PuzzleProgress[]){const map=new Map<string,PuzzleProgress>();for(const row of [...a,...b]){const old=map.get(row.id);if(!old)map.set(row.id,row);else map.set(row.id,{id:row.id,solvedAt:Date.parse(row.solvedAt)>Date.parse(old.solvedAt)?row.solvedAt:old.solvedAt,attempts:Math.max(old.attempts,row.attempts)})}return [...map.values()]}

export async function loadAcademyProgress(session:Session|null){const local=await readJson<string[]>(ACADEMY_KEY,[]);if(!session||!supabase)return local;const {data}=await supabase.from("player_progress").select("preferences").eq("user_id",session.user.id).maybeSingle();const prefs=(data?.preferences&&typeof data.preferences==="object"?data.preferences:{}) as Preferences;const merged=[...new Set([...local,...strings(prefs.mobileAcademyComplete)])];await writeJson(ACADEMY_KEY,merged);await supabase.from("player_progress").upsert({user_id:session.user.id,preferences:{...prefs,mobileAcademyComplete:merged},updated_at:new Date().toISOString()},{onConflict:"user_id"});return merged}

export async function saveAcademyProgress(session:Session|null,complete:string[]){const merged=[...new Set(complete)];await writeJson(ACADEMY_KEY,merged);if(!session||!supabase)return;const {data}=await supabase.from("player_progress").select("preferences").eq("user_id",session.user.id).maybeSingle();const prefs=(data?.preferences&&typeof data.preferences==="object"?data.preferences:{}) as Preferences;await supabase.from("player_progress").upsert({user_id:session.user.id,preferences:{...prefs,mobileAcademyComplete:merged},updated_at:new Date().toISOString()},{onConflict:"user_id"})}

export async function loadPuzzleProgress(session:Session|null){const local=await readJson<PuzzleProgress[]>(PUZZLE_KEY,[]);if(!session||!supabase)return local;const {data}=await supabase.from("player_progress").select("puzzle_progress").eq("user_id",session.user.id).maybeSingle<Pick<RemoteProgress,"puzzle_progress">>();const merged=mergePuzzles(local,puzzleRows(data?.puzzle_progress));await writeJson(PUZZLE_KEY,merged);await supabase.from("player_progress").upsert({user_id:session.user.id,puzzle_progress:merged,updated_at:new Date().toISOString()},{onConflict:"user_id"});return merged}

export async function recordPuzzleSolved(session:Session|null,id:string,existing:PuzzleProgress[]){const now=new Date().toISOString();const old=existing.find(x=>x.id===id);const next=mergePuzzles(existing,[{id,solvedAt:now,attempts:(old?.attempts??0)+1}]);await writeJson(PUZZLE_KEY,next);if(session&&supabase)await supabase.from("player_progress").upsert({user_id:session.user.id,puzzle_progress:next,updated_at:now},{onConflict:"user_id"});return next}
