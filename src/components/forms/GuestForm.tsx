"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { createGuestForMatch } from "@/lib/actions";

export function GuestForm({ matchId }: { matchId: string }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createGuestForMatch(matchId, formData);
      if (!result.ok) {
        setError(result.error || "Nao foi possivel adicionar o convidado.");
        return;
      }
      setSuccess("Convidado adicionado e marcado como presente.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <Label>Nome do convidado</Label>
          <Input name="name" required />
        </div>
        <div className="w-20">
          <Label>Nota</Label>
          <Input name="rating" type="number" min={0} max={5} step={0.5} defaultValue={3} required />
        </div>
      </div>
      <div>
        <Label>Posicao</Label>
        <Select name="position" defaultValue="MEIA">
          <option value="GOLEIRO">Goleiro</option>
          <option value="DEFESA">Defesa</option>
          <option value="MEIA">Meia</option>
          <option value="ATAQUE">Ataque</option>
        </Select>
      </div>
      {error ? <p className="rounded-[13px] bg-ausente/10 p-3 text-sm font-semibold text-ausente">{error}</p> : null}
      {success ? <p className="rounded-[13px] bg-campo/10 p-3 text-sm font-semibold text-campo">{success}</p> : null}
      <Button className="w-full" type="submit" disabled={isPending}>
        <Plus size={16} />
        {isPending ? "Adicionando..." : "Adicionar convidado"}
      </Button>
    </form>
  );
}
