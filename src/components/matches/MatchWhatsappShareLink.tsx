"use client";

import { useEffect, useMemo, useState } from "react";
import { WhatsappMark } from "@/components/ui/WhatsappMark";

export function MatchWhatsappShareLink({
  matchId,
  title,
  time,
  location,
  className = ""
}: {
  matchId: string;
  title: string;
  time: string;
  location?: string | null;
  className?: string;
}) {
  const [origin, setOrigin] = useState("");
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const locationLabel = useMemo(() => location?.trim() || "Local a definir", [location]);

  async function openWhatsappInvite() {
    if (!origin || isOpening) return;
    setIsOpening(true);
    const whatsappWindow = window.open("", "_blank", "noopener,noreferrer");

    try {
      const response = await fetch("/api/peladas/share-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId })
      });

      if (!response.ok) {
        throw new Error("Nao foi possivel gerar o convite.");
      }

      const data = (await response.json()) as { code: string };
      const inviteUrl = `${origin}/convite/${data.code}?matchId=${encodeURIComponent(matchId)}`;
      const message = [
        "⚽ Bora pra pelada?",
        "",
        `🏷️ Evento: ${title}`,
        `🕒 Hora: ${time}`,
        `📍 Local: ${locationLabel}`,
        "",
        "✅ Entre na peladinha e confirme presença:",
        inviteUrl
      ].join("\n");
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }
    } catch (error) {
      whatsappWindow?.close();
      throw error;
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openWhatsappInvite}
      disabled={!origin || isOpening}
      className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-[11px] bg-[#25D366] px-3 py-2.5 text-center text-sm font-bold text-white shadow-button transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
    >
      <WhatsappMark size={18} /> {isOpening ? "Abrindo..." : "Enviar no WhatsApp"}
    </button>
  );
}
