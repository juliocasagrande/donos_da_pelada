import Link from "next/link";
import { Bell, KeyRound, LogOut, Radar, Shield, UserRound, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PlayerForm } from "@/components/forms/PlayerForm";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { PushPreferenceSettings } from "@/components/profile/PushPreferenceSettings";
import { RadarSettingsForm } from "@/components/profile/RadarSettingsForm";
import { Card } from "@/components/ui/Card";
import { updateOwnProfile } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default async function ProfilePage({
  searchParams
}: {
  searchParams: Promise<{ salvo?: string; radarErro?: string }>;
}) {
  const user = await requireUser();
  const { salvo, radarErro } = await searchParams;
  const player = await prisma.player.findFirst({ where: { userId: user.id, peladaId: user.peladaId! } });
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      whatsapp: true,
      whatsappChatEnabled: true,
      pushNotificationsEnabled: true,
      passwordHash: true,
      radarEnabled: true,
      radarRadiusKm: true,
      address: true,
      latitude: true,
      longitude: true
    }
  });

  return (
    <AppShell>
      <div className="mb-5">
        <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Minha conta</p>
        <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Meu perfil</h1>
        <p className="text-musgo">{user.email}</p>
        {user.role === "MASTER" ? (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#FCEFD6] px-2.5 py-1.5 text-xs font-bold text-[#8a5a06]">
            <Shield size={14} /> Administrador master
          </span>
        ) : null}
      </div>

      {salvo ? (
        <div className="animate-card mb-4 rounded-[13px] border border-campo/30 bg-[#EAF5EC] p-3 text-sm font-semibold text-campo">
          Perfil atualizado com sucesso.
        </div>
      ) : null}
      {radarErro ? (
        <div className="animate-card mb-4 rounded-[13px] border border-ausente/30 bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">
          {radarErro}
        </div>
      ) : null}

      <div className="mx-auto grid max-w-md gap-4">
        <section>
          <div className="mb-2 flex items-center gap-2 px-1">
            <UserRound size={17} className="text-campo" />
            <h2 className="text-sm font-extrabold uppercase tracking-[.08em] text-musgo">Dados do perfil</h2>
          </div>
          <Card>
            <PlayerForm
              action={updateOwnProfile}
              player={
                player
                  ? { ...player, ...profile }
                  : profile
                    ? {
                        nickname: user.name || "",
                        photoUrl: user.image || null,
                        position: "MEIA",
                        rating: 0,
                        whatsapp: profile.whatsapp,
                        whatsappChatEnabled: profile.whatsappChatEnabled
                      }
                    : undefined
              }
              submitLabel="Salvar alteracoes"
              canEditRating={false}
              showWhatsapp
            />
          </Card>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2 px-1">
            <KeyRound size={17} className="text-campo" />
            <h2 className="text-sm font-extrabold uppercase tracking-[.08em] text-musgo">Seguranca</h2>
          </div>
          <Card>
            <ChangePasswordForm hasPassword={Boolean(profile?.passwordHash)} />
          </Card>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2 px-1">
            <Bell size={17} className="text-campo" />
            <h2 className="text-sm font-extrabold uppercase tracking-[.08em] text-musgo">Notificacoes</h2>
          </div>
          <Card>
            <PushPreferenceSettings initialEnabled={Boolean(profile?.pushNotificationsEnabled)} />
          </Card>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2 px-1">
            <Radar size={17} className="text-campo" />
            <h2 className="text-sm font-extrabold uppercase tracking-[.08em] text-musgo">Radar de peladas</h2>
          </div>
          <Card>
            <RadarSettingsForm
              initialEnabled={Boolean(profile?.radarEnabled)}
              initialRadiusKm={profile?.radarRadiusKm ?? 10}
              initialAddress={profile?.address ?? ""}
              initialLat={profile?.latitude ?? null}
              initialLon={profile?.longitude ?? null}
            />
          </Card>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2 px-1">
            <Users size={17} className="text-campo" />
            <h2 className="text-sm font-extrabold uppercase tracking-[.08em] text-musgo">Conta</h2>
          </div>
          <Card className="divide-y divide-linha p-0">
            <Link href="/peladas" className="flex items-center gap-3 p-3.5">
              <Users className="text-campo" size={18} />
              <span className="flex-1 font-semibold">Gerenciar peladas</span>
            </Link>
            <Link href="/logout" className="flex items-center gap-3 p-3.5 text-ausente">
              <LogOut size={18} />
              <span className="flex-1 font-semibold">Sair da conta</span>
            </Link>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
