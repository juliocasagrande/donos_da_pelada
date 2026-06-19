"use client";

import { useState } from "react";
import { Radar } from "lucide-react";
import { AddressAutocomplete } from "@/components/forms/AddressAutocomplete";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Label } from "@/components/ui/Input";
import { updateRadarSettings } from "@/lib/radarActions";

export function RadarSettingsForm({
  initialEnabled,
  initialRadiusKm,
  initialAddress,
  initialLat,
  initialLon
}: {
  initialEnabled: boolean;
  initialRadiusKm: number;
  initialAddress: string;
  initialLat: number | null;
  initialLon: number | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm);

  return (
    <form action={updateRadarSettings} className="space-y-3">
      <label className="flex items-center justify-between gap-3 rounded-[13px] border-[1.5px] border-linha bg-white p-3">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EAF5EC] text-campo">
            <Radar size={18} />
          </span>
          <span>
            <span className="block text-sm font-bold text-tinta">Buscar peladas perto de mim</span>
            <span className="block text-xs text-musgo">Aparece no radar de quem abriu a pelada para externos.</span>
          </span>
        </span>
        <input
          type="checkbox"
          name="radarEnabled"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className="h-5 w-9 shrink-0 accent-campo"
        />
      </label>

      <div className={enabled ? "space-y-3 rounded-[13px] border-[1.5px] border-linha bg-areia p-3" : "hidden"}>
        <div>
          <Label>Seu endereco</Label>
          <AddressAutocomplete defaultValue={initialAddress} defaultLat={initialLat} defaultLon={initialLon} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Raio de busca</Label>
            <span className="text-sm font-bold text-campo">{radiusKm} km</span>
          </div>
          <input
            type="range"
            name="radarRadiusKm"
            min={1}
            max={20}
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
            className="w-full accent-campo"
          />
        </div>
      </div>
      {!enabled ? <input type="hidden" name="radarRadiusKm" value={radiusKm} /> : null}

      <SubmitButton className="w-full py-2 text-sm" pendingLabel="Salvando...">
        Salvar radar
      </SubmitButton>
    </form>
  );
}
