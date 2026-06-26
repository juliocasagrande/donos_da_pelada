"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function PushNotifications({
  promptDismissed,
  notificationsEnabled
}: {
  promptDismissed: boolean;
  notificationsEnabled: boolean;
}) {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [dismissed, setDismissed] = useState(promptDismissed);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAvailable(
      "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    );

    navigator.serviceWorker?.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription) || notificationsEnabled))
      .catch(() => setEnabled(false));
  }, [notificationsEnabled]);

  async function enableNotifications() {
    setMessage("");

    if (!available) {
      setMessage("Notificacoes push nao estao configuradas neste navegador.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Permissao de notificacao nao concedida.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "")
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        setMessage("Nao foi possivel salvar este dispositivo.");
        return;
      }

      setEnabled(true);
      setDismissed(true);
      setMessage("Notificacoes ativadas.");
    } catch (error) {
      console.error("Falha ao ativar notificacoes:", error);
      setMessage("Nao foi possivel ativar as notificacoes neste dispositivo.");
    }
  }

  async function disableNotifications() {
    setMessage("");
    setEnabled(false);
    setDismissed(true);

    try {
      const registration = await navigator.serviceWorker?.ready.catch(() => null);
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe().catch(() => null);

      const response = await fetch("/api/push/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false })
      });

      if (!response.ok) {
        console.error("Falha ao salvar preferencia de notificacao:", response.status);
      }
    } catch (error) {
      console.error("Falha ao desativar notificacoes:", error);
    }
  }

  if (!available || enabled || dismissed) return null;

  return (
    <div className="mx-auto mb-3 max-w-md rounded-card bg-white p-3 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#EAF5EC] text-campo">
          <Bell size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-tinta">Receber avisos da pelada</p>
          {message ? <p className="text-xs text-musgo">{message}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={disableNotifications}>
            Nao receber
          </Button>
          <Button type="button" className="px-3 py-2 text-xs" onClick={enableNotifications}>
            Ativar
          </Button>
        </div>
      </div>
    </div>
  );
}
