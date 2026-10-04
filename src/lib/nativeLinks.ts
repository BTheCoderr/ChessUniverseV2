export const PUBLIC_APP_URL = "https://chessuniverse.netlify.app";
export const NATIVE_URL_SCHEME = "chessuniverse";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function challengeIdFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const queryChallenge = url.searchParams.get("challenge");
    if (queryChallenge && UUID_RE.test(queryChallenge)) return queryChallenge;

    if (url.protocol === `${NATIVE_URL_SCHEME}:` && url.hostname === "challenge") {
      const pathId = url.pathname.replace(/^\/+/, "");
      if (UUID_RE.test(pathId)) return pathId;
    }
  } catch {
    return null;
  }

  return null;
}

export function publicChallengeUrl(gameId: string) {
  const url = new URL(PUBLIC_APP_URL);
  url.searchParams.set("challenge", gameId);
  return url.toString();
}
