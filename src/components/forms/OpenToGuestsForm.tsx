"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { closeMatchToGuests, openMatchToGuests } from "@/lib/radarActions";

type FeeMode = "FREE" | "CHARGE" | "PAY";

const feeModeLabels: Record<FeeMode, string> = {
  FREE: "Gratis",
  CHARGE: "Jogador paga",
  PAY: "Pelada paga"
};

function FeeModeField({
  label,
  name,
  amountName,
  defaultMode,
  defaultAmount
}: {
  label: string;
  name: string;
  amountName: string;
  defaultMode: FeeMode;
  defaultAmount: number | null;
}) {
  const [mode, setMode] = useState<FeeMode>(defaultMode);

  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(feeModeLabels) as FeeMode[]).map((option) => (
          <label key={option} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              defaultChecked={defaultMode === option}
              onChange={() => setMode(option)}
              className="peer sr-only"
            />
            <span className="block rounded-[11px] border-[1.5px] border-linha bg-white px-2 py-2.5 text-center text-xs font-semibold text-musgo transition peer-checked:border-campo peer-checked:bg-campo peer-checked:text-white">
              {feeModeLabels[option]}
            </span>
          </label>
        ))}
      </div>
      {mode !== "FREE" ? (
        <div className="mt-2">
          <Input
            name={amountName}
            type="number"
            step="0.01"
            min={0}
            inputMode="decimal"
            placeholder="Valor em R$"
            defaultValue={defaultAmount ?? ""}
          />
        </div>
      ) : null}
    </div>
  );
}

export function OpenToGuestsForm({
  matchId,
  openToGuests,
  guestLineSlots,
  guestGoalkeeperSlots,
  guestLineFeeMode,
  guestGoalkeeperFeeMode,
  guestLineFeeAmount,
  guestGoalkeeperFeeAmount,
  guestMinRating,
  guestMaxRating,
  approvedLineCount = 0,
  approvedGoalkeeperCount = 0
}: {
  matchId: string;
  openToGuests: boolean;
  guestLineSlots: number | null;
  guestGoalkeeperSlots: number | null;
  guestLineFeeMode: FeeMode;
  guestGoalkeeperFeeMode: FeeMode;
  guestLineFeeAmount: number | null;
  guestGoalkeeperFeeAmount: number | null;
  guestMinRating: number | null;
  guestMaxRating: number | null;
  approvedLineCount?: number;
  approvedGoalkeeperCount?: number;
}) {
  if (openToGuests) {
    return (
      <div className="space-y-3">
        <div className="rounded-[13px] border border-campo/30 bg-[#EAF5EC] p-3 text-sm font-semibold text-campo">
          Esta pelada esta aberta no radar para jogadores externos.
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-musgo">
          <span className="rounded-[10px] bg-areia px-2 py-2 text-center">
            Linha: {approvedLineCount}/{guestLineSlots ?? 0} preenchidas
          </span>
          <span className="rounded-[10px] bg-areia px-2 py-2 text-center">
            Goleiro: {approvedGoalkeeperCount}/{guestGoalkeeperSlots ?? 0} preenchidas
          </span>
        </div>
        <form action={closeMatchToGuests.bind(null, matchId)}>
          <Button type="submit" variant="secondary" className="w-full">
            Fechar para externos
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={openMatchToGuests.bind(null, matchId)} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Vagas de linha</Label>
          <Input name="guestLineSlots" type="number" min={0} defaultValue={guestLineSlots ?? 0} />
        </div>
        <div>
          <Label>Vagas de goleiro</Label>
          <Input name="guestGoalkeeperSlots" type="number" min={0} defaultValue={guestGoalkeeperSlots ?? 0} />
        </div>
      </div>

      <FeeModeField
        label="Jogadores de linha"
        name="guestLineFeeMode"
        amountName="guestLineFeeAmount"
        defaultMode={guestLineFeeMode}
        defaultAmount={guestLineFeeAmount}
      />
      <FeeModeField
        label="Goleiros"
        name="guestGoalkeeperFeeMode"
        amountName="guestGoalkeeperFeeAmount"
        defaultMode={guestGoalkeeperFeeMode}
        defaultAmount={guestGoalkeeperFeeAmount}
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Nota minima</Label>
          <Input name="guestMinRating" type="number" min={0} max={10} step="0.5" defaultValue={guestMinRating ?? ""} placeholder="0" />
        </div>
        <div>
          <Label>Nota maxima</Label>
          <Input name="guestMaxRating" type="number" min={0} max={10} step="0.5" defaultValue={guestMaxRating ?? ""} placeholder="10" />
        </div>
      </div>

      <SubmitButton className="w-full" pendingLabel="Abrindo...">
        Abrir pelada para externos
      </SubmitButton>
    </form>
  );
}
