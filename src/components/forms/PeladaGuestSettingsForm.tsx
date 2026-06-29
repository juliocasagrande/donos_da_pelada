"use client";

import { useState } from "react";
import { Clock, Users } from "lucide-react";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Label, Select } from "@/components/ui/Input";
import { updatePeladaGuestSettings } from "@/lib/peladaAdminActions";

export function PeladaGuestSettingsForm({
  initialRestrictGuestInviteTime,
  initialGuestInviteHour,
  initialDeprioritizeGuestsInDraw
}: {
  initialRestrictGuestInviteTime: boolean;
  initialGuestInviteHour: number;
  initialDeprioritizeGuestsInDraw: boolean;
}) {
  const [restrictTime, setRestrictTime] = useState(initialRestrictGuestInviteTime);
  const [deprioritize, setDeprioritize] = useState(initialDeprioritizeGuestsInDraw);

  return (
    <form action={updatePeladaGuestSettings} className="space-y-3">
      <label className="flex items-center justify-between gap-3 rounded-[13px] border-[1.5px] border-linha bg-white p-3">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EAF5EC] text-campo">
            <Clock size={18} />
          </span>
          <span>
            <span className="block text-sm font-bold text-tinta">Restringir horario de convidados</span>
            <span className="block text-xs text-musgo">
              Mensalistas so podem chamar convidados a partir de um horario no dia da pelada. Admins nunca sao afetados.
            </span>
          </span>
        </span>
        <input
          type="checkbox"
          name="restrictGuestInviteTime"
          checked={restrictTime}
          onChange={(event) => setRestrictTime(event.target.checked)}
          className="h-5 w-9 shrink-0 accent-campo"
        />
      </label>

      <div className={restrictTime ? "rounded-[13px] border-[1.5px] border-linha bg-areia p-3" : "hidden"}>
        <Label>Horario liberado a partir de</Label>
        <Select name="guestInviteHour" defaultValue={initialGuestInviteHour}>
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2, "0")}h
            </option>
          ))}
        </Select>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-[13px] border-[1.5px] border-linha bg-white p-3">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EAF5EC] text-campo">
            <Users size={18} />
          </span>
          <span>
            <span className="block text-sm font-bold text-tinta">Preterir convidados no sorteio</span>
            <span className="block text-xs text-musgo">
              Quando faltam vagas, mensalistas tem prioridade sobre convidados ao sortear os times.
            </span>
          </span>
        </span>
        <input
          type="checkbox"
          name="deprioritizeGuestsInDraw"
          checked={deprioritize}
          onChange={(event) => setDeprioritize(event.target.checked)}
          className="h-5 w-9 shrink-0 accent-campo"
        />
      </label>

      <SubmitButton className="w-full py-2 text-sm" pendingLabel="Salvando...">
        Salvar configuracoes
      </SubmitButton>
    </form>
  );
}
