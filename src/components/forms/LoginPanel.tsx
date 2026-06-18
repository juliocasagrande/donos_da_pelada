"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { AuthButtons, CredentialsLogin } from "@/components/forms/AuthButtons";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

type PlayerView = "login" | "signup";

export function LoginPanel({
  socialProviders = [],
  callbackUrl = "/dashboard"
}: {
  socialProviders?: string[];
  callbackUrl?: string;
}) {
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
      callbackUrl: callbackUrl === "/dashboard" ? "/onboarding" : callbackUrl
    });
  }

  return (
    <>
      <div className="space-y-2.5">
        {playerView === "login" ? (
          <>
            <CredentialsLogin submitLabel="Entrar" emailLabel="E-mail" callbackUrl={callbackUrl} />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-linha" />
              <span className="text-[11px] text-musgo">ou entrar com</span>
              <div className="h-px flex-1 bg-linha" />
            </div>
            <AuthButtons socialProviders={socialProviders} requiredProviders={["google"]} compact callbackUrl={callbackUrl} />
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
            <AuthButtons
              socialProviders={socialProviders}
              requiredProviders={["google"]}
              compact
              callbackUrl={callbackUrl === "/dashboard" ? "/onboarding" : callbackUrl}
            />
            <p className="text-center text-[13px] text-musgo">
              Ja tenho conta.{" "}
              <button type="button" className="font-bold text-mata" onClick={() => setPlayerView("login")}>
                Entrar
              </button>
            </p>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-linha" />
        <span className="text-[11px] text-musgo">ou</span>
        <div className="h-px flex-1 bg-linha" />
      </div>
      <Link href="/convite" className="mt-3 block">
        <Button type="button" variant="secondary" className="w-full">
          <Ticket size={18} /> Entrar com código de convite
        </Button>
      </Link>
    </>
  );
}
