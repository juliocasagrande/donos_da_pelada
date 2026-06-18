"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function AuthButtons({
  socialProviders,
  requiredProviders = [],
  compact = false
}: {
  socialProviders: string[];
  requiredProviders?: Array<"google" | "facebook" | "instagram">;
  compact?: boolean;
}) {
  const [error, setError] = useState("");
  const providers = Array.from(new Set([...requiredProviders, ...socialProviders]));
  const visibleProviders = providers.filter((provider) => ["google", "facebook", "instagram"].includes(provider));
  const compactClass = compact && visibleProviders.length > 1 ? "grid grid-cols-2 gap-2" : compact ? "grid gap-2" : "space-y-2.5";

  function handleSocialLogin(provider: "google" | "facebook" | "instagram") {
    setError("");

    if (!socialProviders.includes(provider)) {
      setError(
        provider === "google"
          ? "Login com Google ainda nao foi configurado no .env."
          : provider === "facebook"
            ? "Login com Facebook ainda nao foi configurado no .env."
            : "Login com Instagram ainda nao foi configurado no .env."
      );
      return;
    }

    signIn(provider, { callbackUrl: "/dashboard" });
  }

  return (
    <div className={compactClass}>
      {providers.includes("google") ? (
        <Button
          className={
            compact
              ? "min-h-10 w-full border-[1.5px] border-[#F3C6C1] bg-[#FFF4F2] px-3 py-2 text-xs text-[#7A2D26] shadow-card hover:bg-[#FFECEA]"
              : "w-full border-[1.5px] border-[#F3C6C1] bg-[#FFF4F2] text-[#7A2D26] shadow-card hover:bg-[#FFECEA]"
          }
          type="button"
          onClick={() => handleSocialLogin("google")}
        >
          <span className="google-login-mark flex h-5 w-5 items-center justify-center rounded-full bg-white font-display text-sm font-extrabold leading-none shadow-[0_3px_8px_rgba(234,67,53,.16)]">
            <span className="bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05] bg-clip-text text-transparent">G</span>
          </span>
          Google
        </Button>
      ) : null}
      {providers.includes("facebook") ? (
        <Button className={compact ? "min-h-10 w-full px-3 py-2 text-xs" : "w-full"} type="button" variant="secondary" onClick={() => handleSocialLogin("facebook")}>
          <Facebook size={compact ? 15 : 18} /> Facebook
        </Button>
      ) : null}
      {socialProviders.includes("instagram") ? (
        <Button className="w-full" type="button" variant="secondary" onClick={() => handleSocialLogin("instagram")}>
          <Instagram size={18} /> Entrar com Instagram
        </Button>
      ) : null}
      {error ? (
        <p className="rounded-[13px] border border-ausente/30 bg-ausente/10 p-3 text-sm font-semibold text-ausente">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CredentialsLogin({
  submitLabel = "Entrar",
  emailLabel = "E-mail"
}: {
  submitLabel?: string;
  emailLabel?: string;
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    await signIn("credentials", { email, password, callbackUrl: "/dashboard" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div>
        <Label>{emailLabel}</Label>
        <Input name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label>Senha</Label>
        <Input name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button className="w-full" type="submit">
        {submitLabel}
      </Button>
    </form>
  );
}
