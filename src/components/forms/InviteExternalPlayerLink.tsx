"use client";

import { MessageCircle } from "lucide-react";

export function InviteExternalPlayerLink({
  code,
  peladaName,
  playerName,
  whatsapp
}: {
  code: string;
  peladaName: string;
  playerName: string;
  whatsapp: string;
}) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/convite/${code}` : `/convite/${code}`;
  const message = `Fala, ${playerName}! Quero te convidar para jogar na pelada ${peladaName} no Dono da Pelada. Entra por aqui: ${url}`;
  const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[13px] bg-campo px-4 py-2 text-sm font-bold text-white shadow-button transition active:scale-[.98]"
    >
      <MessageCircle size={17} /> Convidar
    </a>
  );
}
