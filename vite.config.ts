import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === "native" ? null : VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "brand/knight-icon-192.png",
        "brand/knight-icon-512.png",
        "brand/apple-touch-icon.png",
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
            src: "/brand/knight-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/brand/knight-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
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
  ].filter(Boolean),
  server: { port: 5173 },
}));
