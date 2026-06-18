"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { signIn } from "next-auth/react";
import { AuthButtons, CredentialsLogin } from "@/components/forms/AuthButtons";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type LoginMode = "player" | "admin";
type PlayerView = "login" | "signup";

export function LoginPanel({ socialProviders }: { socialProviders: string[] }) {
  const [mode, setMode] = useState<LoginMode>("player");
  const [playerView, setPlayerView] = useState<PlayerView>("login");
  const [signupError, setSignupError] = useState("");

  async function handlePlayerSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") || ""),
        email,
        password
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSignupError(result.error || "Nao foi possivel criar a conta.");
      return;
    }

    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard"
    });
  }

  return (
    <>
      <div className="mb-3 grid grid-cols-2 rounded-[13px] bg-areia p-1">
        <button
          type="button"
          onClick={() => setMode("player")}
          className={
            mode === "player"
              ? "rounded-[10px] bg-white py-2 text-center text-sm font-semibold text-tinta shadow-card transition"
              : "rounded-[10px] py-2 text-center text-sm font-semibold text-musgo transition"
          }
        >
          Sou jogador
        </button>
        <button
          type="button"
          onClick={() => setMode("admin")}
          className={
            mode === "admin"
              ? "rounded-[10px] bg-white py-2 text-center text-sm font-semibold text-tinta shadow-card transition"
              : "rounded-[10px] py-2 text-center text-sm font-semibold text-musgo transition"
          }
        >
          Sou admin
        </button>
      </div>

      <p className="mb-3 text-[13px] leading-snug text-musgo">
        {mode === "player"
          ? playerView === "login"
            ? "Entre para marcar presenca, votar no craque e acompanhar suas estatisticas."
            : "Crie sua conta. No primeiro acesso voce completa seu perfil de jogador."
          : "Administradores cuidam das peladas, jogadores, sorteios e estatisticas."}
      </p>

      {mode === "player" ? (
        <div className="space-y-2.5">
          {playerView === "login" ? (
            <>
              <CredentialsLogin submitLabel="Entrar com e-mail" emailLabel="E-mail" />
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-linha" />
                <span className="text-[11px] text-musgo">ou entrar com</span>
                <div className="h-px flex-1 bg-linha" />
              </div>
              <AuthButtons socialProviders={socialProviders} requiredProviders={["google"]} compact />
              <p className="text-center text-[13px] text-musgo">
                Novo na pelada?{" "}
                <button type="button" className="font-bold text-mata" onClick={() => setPlayerView("signup")}>
                  Criar conta
                </button>
              </p>
            </>
          ) : (
            <>
              <form onSubmit={handlePlayerSignup} className="space-y-3">
                <div>
                  <Label>Nome</Label>
                  <Input name="name" autoComplete="name" required />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input name="email" type="email" autoComplete="email" required />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input name="password" type="password" autoComplete="new-password" minLength={6} required />
                </div>
                {signupError ? (
                  <p className="rounded-[13px] border border-ausente/30 bg-ausente/10 p-3 text-sm font-semibold text-ausente">
                    {signupError}
                  </p>
                ) : null}
                <Button className="w-full" type="submit">Criar conta</Button>
              </form>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-linha" />
                <span className="text-[11px] text-musgo">ou criar com</span>
                <div className="h-px flex-1 bg-linha" />
              </div>
              <AuthButtons socialProviders={socialProviders} requiredProviders={["google"]} compact />
              <p className="text-center text-[13px] text-musgo">
                Ja tenho conta.{" "}
                <button type="button" className="font-bold text-mata" onClick={() => setPlayerView("login")}>
                  Entrar
                </button>
              </p>
            </>
          )}
        </div>
      ) : (
        <CredentialsLogin submitLabel="Entrar como administrador" emailLabel="E-mail do admin" />
      )}
    </>
  );
}
