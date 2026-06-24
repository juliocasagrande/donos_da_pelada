"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { WhatsappMark } from "@/components/ui/WhatsappMark";

export function CopyInviteLink({ code, peladaName }: { code: string; peladaName: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/convite/${code}` : `/convite/${code}`;
  const message = `Voce foi convidado para entrar na pelada ${peladaName} no Donos da Pelada. Toque no link para acessar: ${url}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-[11px] bg-areia px-3 py-2 text-left text-xs font-semibold text-mata"
      >
        <span className="truncate">{url}</span>
        {copied ? <Check size={14} className="text-campo" /> : <Copy size={14} />}
      </button>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-campo px-3 py-2.5 text-sm font-bold text-white shadow-button transition active:scale-[.98]"
      >
        <WhatsappMark size={18} /> Enviar convite no WhatsApp
      </a>
    </div>
  );
}
