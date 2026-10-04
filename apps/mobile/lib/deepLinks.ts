import * as Linking from "expo-linking";

export function challengeIdFromUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    if (parsed.hostname === "challenge" && parsed.path) return parsed.path.replace(/^\//, "");
    const challenge = parsed.queryParams?.challenge;
    return typeof challenge === "string" && challenge.length > 0 ? challenge : null;
  } catch {
    return null;
  }
}
