import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
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
