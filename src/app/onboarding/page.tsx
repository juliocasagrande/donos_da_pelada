import { Card } from "@/components/ui/Card";
import { PlayerForm } from "@/components/forms/PlayerForm";
import { saveOnboarding } from "@/lib/actions";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");
  if (user.onboarded) redirect("/dashboard");

  return (
    <main className="light-field-lines min-h-screen bg-areia px-5 py-6 text-tinta">
      <div className="mx-auto max-w-md">
        <div className="mb-4">
          <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Primeiro acesso</p>
          <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Monte seu perfil</h1>
          <p className="mt-2 text-musgo">Seu apelido, posicao e selfie aparecem nas peladas, votacoes e rankings.</p>
        </div>
        <Card className="mb-4 border border-campo/15 bg-[#EAF5EC]">
          <h2 className="font-display text-lg font-bold">Salve como aplicativo</h2>
          <p className="mt-1 text-sm text-musgo">
            No celular, abra o menu do navegador e escolha:
          </p>
          <div className="mt-3 grid gap-2 text-sm text-tinta">
            <div className="rounded-[13px] bg-white p-3 shadow-card">
              <strong>Android:</strong> toque em ⋮ e depois em <strong>Adicionar à tela inicial</strong>.
            </div>
            <div className="rounded-[13px] bg-white p-3 shadow-card">
              <strong>iPhone:</strong> toque em compartilhar e depois em <strong>Adicionar à Tela de Início</strong>.
            </div>
          </div>
        </Card>
        <Card>
          <PlayerForm action={saveOnboarding} submitLabel="Entrar na pelada" />
        </Card>
      </div>
    </main>
  );
}
