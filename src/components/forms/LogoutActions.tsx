"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LogoutActions() {
  return (
    <div className="grid gap-3">
      <Button
        type="button"
        className="w-full"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut size={18} />
        Sair da conta
      </Button>
      <Link href="/dashboard">
        <Button type="button" variant="secondary" className="w-full">
          Continuar no app
        </Button>
      </Link>
    </div>
  );
}
