import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Fail fast on an EAS *production* build worker when the public Supabase
 * values are missing, instead of spending a build credit on a binary whose
 * Account, Online and My Games screens cannot connect.
 */
export function assertReleaseEnvironment(env: Record<string, string | undefined> = process.env) {
  if (env.EAS_BUILD !== "true" || env.EAS_BUILD_PROFILE !== "production") return;
  const missing = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"].filter((key) => !env[key]?.trim());
  if (missing.length) {
    throw new Error(`Chess Universe production build is missing ${missing.join(", ")}. Add them to the EAS "production" environment before building.`);
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  assertReleaseEnvironment();
  return {
  ...config,
  name: "Chess Universe",
  slug: "chess-universe",
  version: "1.0",
  orientation: "portrait",
  scheme: "chessuniverse",
  userInterfaceStyle: "dark",
  backgroundColor: "#08152D",
  primaryColor: "#F2C064",
  newArchEnabled: true,
  icon: "./assets/icon.png",
  ios: {
    ...config.ios,
    supportsTablet: true,
    icon: "./assets/icon.png",
    bundleIdentifier: "com.bthecoderr.chessuniverse",
  },
  android: {
    ...config.android,
    package: "com.bthecoderr.chessuniverse",
  },
  plugins: ["expo-router"],
  experiments: { typedRoutes: true },
  extra: {
    ...config.extra,
    eas: process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      ? { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID }
      : config.extra?.eas,
  },
};
};
