import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Plus, Search, Ticket } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");

  const memberships = await prisma.peladaMembership.count({ where: { userId: user.id } });
  if (memberships > 0) redirect(user.hasPlayerProfile ? "/dashboard" : "/perfil/onboarding");

  const firstName = user.name?.split(" ")[0] || "craque";

  return (
    <main className="light-field-lines min-h-screen bg-areia text-tinta">
      <section className="field-hero px-6 pb-10 pt-6 text-white">
        <div className="mx-auto max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Check size={13} /> Conta criada
          </span>
          <h1 className="mt-3 max-w-[300px] font-display text-[28px] font-extrabold leading-[1.05] tracking-[-.02em]">
            Salve, {firstName}! Como voce quer comecar?
          </h1>
        </div>
      </section>

      <section className="relative z-10 -mt-6 px-5 pb-8">
        <div className="mx-auto max-w-md rounded-t-[26px] bg-white p-[18px] pt-[22px] shadow-[0_-10px_40px_rgba(17,40,28,.12)]">
          <div className="space-y-3">
            <Link href="/peladas/criar" className="relative block">
              <Card className="flex items-center gap-3 border-2 border-campo bg-[#F6FBF7] p-4 pr-3">
                <span className="absolute -top-2.5 right-4 rounded-[6px] bg-campo px-2 py-0.5 text-[10px] font-bold text-white">
                  SEU PROPRIO GRUPO
                </span>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-campo">
                  <Plus className="text-white" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-bold">Criar minha pelada</h2>
                  <p className="text-sm leading-snug text-musgo">Voce vira presidente e organiza o grupo</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-campo" />
              </Card>
            </Link>

            <Link href="/peladas/buscar" className="block">
              <Card className="flex items-center gap-3 border border-linha p-4 pr-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#EAF5EC]">
                  <Search className="text-campo" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-bold">Entrar numa pelada</h2>
                  <p className="text-sm leading-snug text-musgo">Busque pelo nome e peca pra entrar</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-[#A7AFA1]" />
              </Card>
            </Link>

            <Link href="/convite" className="block">
              <Card className="flex items-center gap-3 border border-linha p-4 pr-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#FCEFD6]">
                  <Ticket className="text-[#C58207]" size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-bold">Tenho um convite</h2>
                  <p className="text-sm leading-snug text-musgo">Use o codigo ou link que te mandaram</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-[#A7AFA1]" />
              </Card>
            </Link>
          </div>

          <p className="mt-4 px-2 text-center text-xs text-[#A7AFA1]">
            Pode mudar depois - da pra participar de varias peladas ao mesmo tempo.
          </p>
        </div>
      </section>
    </main>
  );
}
