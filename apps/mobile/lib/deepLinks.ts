import * as Linking from "expo-linking";
export const PUBLIC_APP_URL="https://chessuniverse.netlify.app";
const UUID_RE=/^[0-9a-f-]{36}$/i;
export function challengeIdFromUrl(url:string|null|undefined){if(!url)return null;try{const parsed=Linking.parse(url);if(parsed.hostname==="challenge"&&parsed.path){const id=parsed.path.replace(/^\//,"");return UUID_RE.test(id)?id:null}const challenge=parsed.queryParams?.challenge;return typeof challenge==="string"&&UUID_RE.test(challenge)?challenge:null}catch{return null}}
export function publicChallengeUrl(gameId:string){return `${PUBLIC_APP_URL}/?challenge=${encodeURIComponent(gameId)}`}
export function nativeChallengeUrl(gameId:string){return `chessuniverse://challenge/${encodeURIComponent(gameId)}`}
