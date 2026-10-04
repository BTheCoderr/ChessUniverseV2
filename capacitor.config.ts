import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bthecoderr.chessuniverse",
  appName: "Chess Universe",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
