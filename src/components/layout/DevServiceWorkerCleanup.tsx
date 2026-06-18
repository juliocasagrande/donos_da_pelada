"use client";

import { useEffect } from "react";

export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;
    if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) return;

    async function cleanup() {
      const registrations = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all(registrations?.map((registration) => registration.unregister()) ?? []);

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }
    }

    cleanup().catch(() => undefined);
  }, []);

  return null;
}
