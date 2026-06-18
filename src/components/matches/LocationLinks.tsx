"use client";

import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { cn, mapsUrl, wazeUrl } from "@/lib/utils";

export function LocationLinks({ location, className }: { location?: string | null; className?: string }) {
  const [open, setOpen] = useState(false);

  if (!location) {
    return (
      <span className={cn("flex items-center gap-1.5", className)}>
        <MapPin size={15} /> Local a definir
      </span>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
        <MapPin size={14} className="shrink-0" />
        <span className="truncate">{location}</span>
      </span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-mata shadow-card"
      >
        <Navigation size={14} /> Dirigir até o local
      </button>
      {open ? (
        <>
          <a
            href={mapsUrl(location)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-mata shadow-card"
          >
            <MapPin size={14} /> Maps
          </a>
          <a
            href={wazeUrl(location)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-mata shadow-card"
          >
            <Navigation size={14} /> Waze
          </a>
        </>
      ) : null}
    </div>
  );
}
