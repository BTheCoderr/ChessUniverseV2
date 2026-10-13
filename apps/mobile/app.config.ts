import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Chess Universe",
  slug: "chess-universe",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "chessuniverse",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  icon: "./assets/icon.png",
  ios: {
    ...config.ios,
    supportsTablet: true,
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
});
