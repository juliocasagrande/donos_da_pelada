"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/ToastProvider";

const UPDATE_FLAG_KEY = "pwa-update-reloaded";

export function ServiceWorkerRegister() {
  const toast = useToast();

  // Runs after the update-triggered reload below has finished, once the
  // fresh page (and a new ToastProvider instance) has mounted.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(UPDATE_FLAG_KEY)) return;
    sessionStorage.removeItem(UPDATE_FLAG_KEY);
    toast.success("Aplicativo atualizado! Voce esta na versao mais recente.");
  }, [toast]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // A controller already present means a previous SW was actively running,
    // so the next controllerchange is a real update - not the first install.
    const hadController = Boolean(navigator.serviceWorker.controller);

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      if (!hadController) return;
      sessionStorage.setItem(UPDATE_FLAG_KEY, "1");
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | null = null;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
        reg.update().catch(() => undefined);
      })
      .catch(() => undefined);

    const interval = setInterval(() => {
      registration?.update().catch(() => undefined);
    }, 60 * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        registration?.update().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
