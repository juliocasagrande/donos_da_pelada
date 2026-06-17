"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function PhotoUpload({ defaultUrl = "" }: { defaultUrl?: string | null }) {
  const [url, setUrl] = useState(defaultUrl || "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function upload(file?: File) {
    if (!file) return;
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Nao foi possivel enviar a foto.");
        return;
      }
      setUrl(data.url);
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
