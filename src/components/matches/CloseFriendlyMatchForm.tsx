"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { closeMatch } from "@/lib/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="ghost" className="mt-2 w-full py-2 text-xs" type="submit" disabled={pending}>
      {pending ? "Encerrando..." : "Encerrar com esse placar"}
    </Button>
  );
}

export function CloseFriendlyMatchForm({
  matchId,
  homeName,
  awayName
}: {
  matchId: string;
  homeName: string;
  awayName: string;
}) {
  return (
    <form action={closeMatch.bind(null, matchId)} className="rounded-[11px] bg-areia p-2.5">
      <p className="mb-2 text-[11px] font-bold text-musgo">Placar final para encerrar</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="text-[10px] font-semibold text-musgo">
          {homeName}
          <Input name="homeScore" type="number" min={0} className="h-9 text-sm" />
        </label>
        <span className="pb-2 text-sm font-black text-musgo">x</span>
        <label className="text-[10px] font-semibold text-musgo">
          {awayName}
          <Input name="awayScore" type="number" min={0} className="h-9 text-sm" />
        </label>
      </div>
      <SubmitButton />
    </form>
  );
}
