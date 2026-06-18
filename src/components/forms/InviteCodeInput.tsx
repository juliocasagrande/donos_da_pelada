"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

function extractCode(raw: string) {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/convite\/([^/?#\s]+)/);
  return (match ? match[1] : trimmed).trim();
}

export function InviteCodeInput() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = extractCode(value);
    if (code) router.push(`/convite/${code}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (pasted) {
            event.preventDefault();
            setValue(extractCode(pasted));
          }
        }}
        placeholder="Cole ou digite o código"
        autoFocus
        className="w-full rounded-[13px] border-[1.5px] border-linha bg-[#F6F8F3] px-4 py-3.5 text-center font-jersey text-xl font-semibold tracking-[.08em] text-tinta outline-none focus:border-campo"
      />
      <Button type="submit" className="w-full" disabled={!value.trim()}>
        Continuar
      </Button>
    </form>
  );
}
