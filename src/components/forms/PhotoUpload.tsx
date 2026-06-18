"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function PhotoUpload({ defaultUrl = "" }: { defaultUrl?: string | null }) {
  const [url, setUrl] = useState(defaultUrl || "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function upload(file?: File) {
    if (!file) return;
    setError("");
    startTransition(async () => {
      try {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data) {
          setError(data?.error || "Nao foi possivel enviar a foto. Tente uma foto menor.");
          return;
        }

        setUrl(data.url);
      } catch {
        setError("Nao foi possivel enviar a foto. Verifique sua conexao e tente novamente.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="photoUrl" value={url} />
      <div className="relative aspect-square overflow-hidden rounded-card border border-linha bg-[#F6F8F3]">
        {url ? (
          <Image src={url} alt="Foto do jogador" fill className="object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-musgo/60">
            <Camera size={36} />
            <span className="text-sm font-semibold">Selfie ou foto</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-linha bg-white px-3 text-sm font-semibold text-tinta">
          <Camera size={17} /> Camera
          <Input className="hidden" type="file" accept="image/*" capture="user" onChange={(event) => upload(event.target.files?.[0])} />
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-linha bg-white px-3 text-sm font-semibold text-tinta">
          <Upload size={17} /> Galeria
          <Input className="hidden" type="file" accept="image/*" onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </div>
      {pending ? <p className="text-sm font-semibold text-campo">Enviando foto...</p> : null}
      {error ? <p className="text-sm font-semibold text-ausente">{error}</p> : null}
    </div>
  );
}
