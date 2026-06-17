import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LogoutActions } from "@/components/forms/LogoutActions";
import { getCurrentUser } from "@/lib/session";

export default async function LogoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="light-field-lines flex min-h-screen items-center bg-areia px-5 py-8 text-tinta">
      <Card className="mx-auto w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#EAF5EC] text-campo">
            <LogOut size={28} />
          </div>
          <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Encerrar sessao</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-.02em]">Deseja sair?</h1>
          <p className="mt-2 text-sm text-musgo">
            Voce esta conectado como <strong className="font-semibold text-tinta">{user.name || user.email}</strong>.
          </p>
          {user.role === "MASTER" ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#FCEFD6] px-2.5 py-1.5 text-xs font-bold text-[#8a5a06]">
              <ShieldCheck size={14} />
              Administrador master
            </p>
          ) : null}
        </div>
        <LogoutActions />
      </Card>
    </main>
  );
}
