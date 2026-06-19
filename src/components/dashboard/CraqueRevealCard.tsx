"use client";

import { useState } from "react";
import { Sparkles, Star, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function CraqueRevealCard({
  nickname,
  title,
  photoUrl,
  position
}: {
  nickname: string;
  title: string;
  photoUrl?: string | null;
  position?: string | null;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className="group mb-4 block w-full text-left"
      aria-label={revealed ? `Craque atual: ${nickname}` : "Revelar craque atual"}
    >
      <div className="relative min-h-[148px] [perspective:900px]">
        <Card
          className={cn(
            "shine-sweep absolute inset-0 flex min-h-[148px] flex-col justify-between overflow-hidden border border-craque/30 bg-[#FCEFD6] transition duration-700 [backface-visibility:hidden] [transform-style:preserve-3d]",
            revealed && "[transform:rotateY(180deg)]"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#8a5a06]">
              <Star size={14} fill="#F4A11A" /> Craque atual
            </p>
            <Sparkles className="text-craque transition group-active:scale-90" size={22} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-[-.02em]">Toque para revelar</h2>
            <p className="mt-1 text-sm font-semibold text-musgo">{title}</p>
          </div>
        </Card>

        <Card
          className={cn(
            "absolute inset-0 min-h-[148px] overflow-hidden border border-craque/40 bg-gradient-to-br from-[#fff4d8] to-[#eaf5ec] opacity-0 transition duration-700 [backface-visibility:hidden] [transform:rotateY(180deg)] [transform-style:preserve-3d]",
            revealed && "opacity-100 [transform:rotateY(360deg)]"
          )}
        >
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full border border-craque/30" />
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-[#8a5a06]">
            <Trophy size={14} fill="#F4A11A" /> Craque revelado
          </p>
          <div className="mt-3 flex items-center gap-3">
            <PlayerAvatar src={photoUrl} name={nickname} position={position ?? undefined} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-3xl font-extrabold tracking-[-.02em] text-mata">{nickname}</h2>
              <p className="mt-1 text-sm font-semibold text-musgo">{title}</p>
            </div>
          </div>
        </Card>
      </div>
    </button>
  );
}
