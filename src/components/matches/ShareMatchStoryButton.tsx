"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function svgBlobToPngBlob(svgBlob: Blob) {
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Nao foi possivel preparar a imagem.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
    if (!pngBlob) throw new Error("Nao foi possivel converter a imagem.");
    return pngBlob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

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
      const response = await fetch(`/api/stories/match/${matchId}/player/${playerId}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || payload?.error || "Falha ao gerar imagem.");
      }
      const svgBlob = await response.blob();
      const blob = await svgBlobToPngBlob(svgBlob);
      const fileName = `pelada-${fileLabel}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Minha pelada" });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
          console.warn("Falha ao compartilhar pelo navegador, baixando a imagem.", shareError);
        }
      }

      downloadBlob(blob, fileName);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Nao foi possivel gerar a imagem.");
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
