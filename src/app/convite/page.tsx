import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Ticket } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { InviteCodeInput } from "@/components/forms/InviteCodeInput";
import { getCurrentUser } from "@/lib/session";

export default async function ConvitePage() {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <Link href="/peladas" className="text-tinta">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-display text-2xl font-extrabold tracking-[-.02em]">Tenho um convite</h1>
      </div>

      <Card className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-3 flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-[#FCEFD6]">
          <Ticket className="text-[#C58207]" size={28} />
        </div>
        <p className="mb-4 text-sm text-musgo">Digite o código que te mandaram</p>
        <InviteCodeInput />
      </Card>

      <p className="mt-5 px-4 text-center text-xs text-[#A7AFA1]">
        Recebeu um link? Toque nele que preenchemos o código automaticamente.
      </p>
    </AppShell>
  );
}
