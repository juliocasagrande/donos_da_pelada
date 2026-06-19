"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ShareMatchStoryButton({
  matchId,
  playerId,
  fileLabel,
  label = "Compartilhar",
  className = "gap-1.5 py-1.5 text-[11px]"
}: {
  matchId: string;
  playerId: string;
  fileLabel: string;
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleShare() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/stories/match/${matchId}/player/${playerId}`);
      if (!response.ok) throw new Error("Falha ao gerar imagem.");
      const blob = await response.blob();
      const fileName = `pelada-${fileLabel}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Minha pelada" });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Nao foi possivel gerar a imagem.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0">
      <Button type="button" variant="secondary" className={className} onClick={handleShare} disabled={loading}>
        <Share2 size={13} /> {loading ? "Gerando..." : label}
      </Button>
      {error ? <p className="mt-1 text-[10px] font-semibold text-ausente">{error}</p> : null}
    </div>
  );
}
