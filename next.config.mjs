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
  register: true,
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
  }
};

export default withPWA(nextConfig);
