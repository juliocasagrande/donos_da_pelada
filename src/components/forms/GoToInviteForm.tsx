"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function GoToInviteForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.trim()) router.push(`/convite/${code.trim()}`);
      }}
    >
      <input
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="Cole o codigo aqui"
        className="flex-1 rounded-[11px] border-[1.5px] border-linha px-3 py-2 text-sm"
        required
      />
      <Button type="submit" className="px-4 text-xs">Ir</Button>
    </form>
  );
}
