"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { PasswordRequirements } from "@/components/forms/PasswordRequirements";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { changePassword } from "@/lib/actions";

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (newPassword !== confirmPassword) {
      setError("As senhas nao coincidem.");
      return;
    }

    startTransition(async () => {
      const result = await changePassword(formData);
      if (!result.ok) {
        setError(result.error || "Nao foi possivel alterar a senha.");
        return;
      }
      setSuccess("Senha alterada com sucesso.");
      setNewPassword("");
      event.currentTarget.reset();
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#EAF5EC] text-campo">
          <KeyRound size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-tinta">Alterar senha</p>
          <p className="mt-0.5 text-xs text-musgo">Use sua senha atual para definir uma nova senha de acesso.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label>Senha atual</Label>
          <Input name="currentPassword" type="password" autoComplete="current-password" required />
        </div>
        <div>
          <Label>Nova senha</Label>
          <Input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <div className="mt-1.5">
            <PasswordRequirements password={newPassword} />
          </div>
        </div>
        <div>
          <Label>Confirmar nova senha</Label>
          <Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        {error ? <p className="rounded-[13px] bg-ausente/10 p-3 text-sm font-semibold text-ausente">{error}</p> : null}
        {success ? <p className="rounded-[13px] bg-campo/10 p-3 text-sm font-semibold text-campo">{success}</p> : null}
        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
