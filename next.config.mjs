import withPWAInit from "next-pwa";
import defaultRuntimeCaching from "next-pwa/cache.js";

// Drop the default page/data/API caching rules: this app mutates data via
// Server Actions, and a service worker that caches page navigations or API
// responses can serve a stale page right after an admin action succeeds,
// even though the underlying data already changed. Keep caching only for
// genuinely static assets (fonts, images, audio/video, js/css bundles).
const staleProneCaches = new Set(["next-data", "static-data-assets", "apis", "others", "cross-origin"]);
const runtimeCaching = defaultRuntimeCaching.filter((rule) => !staleProneCaches.has(rule.options?.cacheName));

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Registration is handled by ServiceWorkerRegister so the app can control
  // update cadence and show an update toast without a second registration.
  register: false,
  skipWaiting: true,
  importScripts: ["push-sw.js"],
  runtimeCaching
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co"
      }
    ]
  },
  // Sem isto, o CDN/edge cache e o cache HTTP do celular podem continuar
  // servindo o sw.js antigo depois do deploy: o browser nunca detecta que o
  // service worker mudou e o fluxo de auto-atualizacao nunca dispara.
  async headers() {
    const noCache = [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }];
    return [
      { source: "/sw.js", headers: noCache },
      { source: "/push-sw.js", headers: noCache },
      { source: "/workbox-:hash(.*)", headers: noCache },
      { source: "/manifest.webmanifest", headers: noCache }
    ];
  }
};

export default withPWA(nextConfig);
