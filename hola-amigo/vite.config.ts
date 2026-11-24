/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Installable "add to home screen" app that works offline.
    VitePWA({
      registerType: "prompt",        // never reload mid-lesson: ask first
      filename: "sw.js",             // same URL as the old hand-written worker, so it replaces it
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "¡Hola, Amigo! — Learn Spanish",
        short_name: "Hola Amigo",
        description: "A fun, interactive Spanish (Castilian) course for children aged 6+.",
        lang: "en-GB",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0B0C14",
        theme_color: "#0B0C14",
        categories: ["education", "kids"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Voice clips: kept once heard (or prefetched when a lesson starts), so lessons talk offline.
            urlPattern: ({ url }) => url.pathname.startsWith("/audio/") && url.pathname.endsWith(".mp3"),
            handler: "CacheFirst",
            options: {
              cacheName: "voice-clips",
              expiration: { maxEntries: 4000 },
              cacheableResponse: { statuses: [200] },
              rangeRequests: true,   // Safari asks for audio in byte ranges
            },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Separate long-lived chunks: an app update doesn't re-download
        // unchanged course content or libraries.
        manualChunks: id => {
          if (id.includes("/content/")) return "content";
          if (/node_modules\/(@firebase|firebase)\//.test(id)) return "firebase";
          if (id.includes("node_modules")) return "vendor";
          return undefined;
        },
      },
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
