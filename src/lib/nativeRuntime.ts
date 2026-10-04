import { App as CapacitorApp, type PluginListenerHandle } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";

export const PUBLIC_APP_URL = "https://chessuniverse.netlify.app";
export const NATIVE_URL_SCHEME = "chessuniverse";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

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

export async function configureNativeChrome() {
  if (!isNativeApp()) return;

  document.documentElement.classList.add("native-app");
  document.body.classList.add("native-app");

  try {
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    // Native chrome styling should never block app startup.
  }
}

export async function registerNativeUrlListener(
  onUrl: (url: string) => void
): Promise<PluginListenerHandle | null> {
  if (!isNativeApp()) return null;

  try {
    const launch = await CapacitorApp.getLaunchUrl();
    if (launch?.url) onUrl(launch.url);

    return await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      if (url) onUrl(url);
    });
  } catch {
    return null;
  }
}

export function nativeImpact(kind: "light" | "medium" | "heavy") {
  if (!isNativeApp()) return;

  const style =
    kind === "heavy"
      ? ImpactStyle.Heavy
      : kind === "medium"
        ? ImpactStyle.Medium
        : ImpactStyle.Light;

  void Haptics.impact({ style }).catch(() => undefined);
}
