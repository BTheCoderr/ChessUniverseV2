import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "pwa-icon.svg",
        "stockfish.js",
        "stockfish-nnue-16-single.wasm",
        "images/pieces/*.svg",
      ],
      manifest: {
        name: "Chess Universe",
        short_name: "Chess Universe",
        description: "Learn, practice, relive legendary games, explore chess variants, and play online.",
        theme_color: "#101314",
        background_color: "#0b0e0f",
        display: "standalone",
        start_url: "/",
        scope: "/",
        orientation: "any",
        icons: [
          {
            src: "/pwa-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Only precache the current Vite app bundle. The repo still carries legacy
        // public HTML/JS files that should not become part of the offline app shell.
        globPatterns: ["index.html", "assets/*.{js,css}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  server: { port: 5173 },
});
