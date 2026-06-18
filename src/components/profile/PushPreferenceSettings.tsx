"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
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

export function PushPreferenceSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    setAvailable(supported);

    if (!supported) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription) || initialEnabled))
      .catch(() => setEnabled(initialEnabled));
  }, [initialEnabled]);

  async function enableNotifications() {
    setMessage("");
    if (!available) {
      setMessage("Notificacoes push nao estao configuradas neste navegador.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      await savePreference(false);
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
      setMessage("Nao foi possivel ativar as notificacoes.");
      return;
    }

    setEnabled(true);
    setMessage("Notificacoes ativadas.");
  }

  async function savePreference(nextEnabled: boolean) {
    const response = await fetch("/api/push/preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: nextEnabled })
    });

    if (!response.ok) {
      setMessage("Nao foi possivel salvar sua preferencia.");
      return false;
    }

    return true;
  }

  async function disableNotifications() {
    setMessage("");
    const registration = await navigator.serviceWorker?.ready.catch(() => null);
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe().catch(() => null);

    if (!(await savePreference(false))) return;

    setEnabled(false);
    setMessage("Notificacoes desativadas.");
  }

  return (
    <div className="rounded-[13px] border-[1.5px] border-linha bg-white p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EAF5EC] text-campo">
          {enabled ? <Bell size={18} /> : <BellOff size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-tinta">Notificacoes</p>
          <p className="text-xs text-musgo">{enabled ? "Voce recebe avisos da pelada neste dispositivo." : "Voce nao recebe avisos push."}</p>
          {message ? <p className="mt-1 text-xs font-semibold text-musgo">{message}</p> : null}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" className="py-2 text-xs" disabled={enabled} onClick={enableNotifications}>
          Ativar
        </Button>
        <Button type="button" variant="secondary" className="py-2 text-xs" disabled={!enabled} onClick={disableNotifications}>
          Nao receber
        </Button>
      </div>
    </div>
  );
}
