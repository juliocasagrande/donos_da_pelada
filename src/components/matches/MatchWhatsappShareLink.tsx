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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const attendanceUrl = `${origin}/matches/${matchId}/attendance`;
  const whatsappUrl = useMemo(() => {
    const message = [
      "⚽ Convite para pelada!",
      "",
      `🏷️ Evento: ${title}`,
      `🕒 Hora: ${time}`,
      `📍 Local: ${location?.trim() || "Local a definir"}`,
      "",
      "✅ Confirme sua presença pelo link:",
      attendanceUrl
    ].join("\n");

    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [attendanceUrl, location, time, title]);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-[11px] bg-[#25D366] px-3 py-2.5 text-center text-sm font-bold text-white shadow-button transition active:scale-[.98] ${className}`}
    >
      <WhatsappMark size={18} /> Enviar no WhatsApp
    </a>
  );
}
