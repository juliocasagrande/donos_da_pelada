import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PeladaCrest } from "@/components/ui/PeladaCrest";
import { buildInvitePath, isInviteValid } from "@/lib/inviteValidity";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function ConviteCodePage({
  params,
  searchParams
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string; matchId?: string }>;
}) {
  const { code } = await params;
  const { error, matchId } = await searchParams;
  const user = await getCurrentUser();
  const invitePath = buildInvitePath(code, matchId);
  const loginHref = `/login?callbackUrl=${encodeURIComponent(invitePath)}`;

  const invite = await prisma.peladaInvite.findUnique({
    where: { code },
    include: {
      pelada: {
        select: {
          name: true,
          _count: { select: { memberships: true } }
        }
      }
    }
  });

  const valid = isInviteValid(invite);

  // Already logged in with a valid invite: join (if not already a member) and
  // land straight on the match/dashboard, no manual "Entrar" click needed.
  // This has to happen in a Route Handler (not here) because cookies() can
  // only be mutated in a Server Action or Route Handler, not during a Server
  // Component render.
  if (invite && valid && user && user.active) {
    redirect(`/convite/${code}/entrar${matchId ? `?matchId=${encodeURIComponent(matchId)}` : ""}`);
  }

  const presidente = valid
    ? await prisma.peladaMembership.findFirst({
        where: { peladaId: invite!.peladaId, role: "PRESIDENTE" },
        include: { user: { select: { name: true, email: true } } }
      })
    : null;

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <Link href="/peladas" className="text-tinta">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-display text-2xl font-extrabold tracking-[-.02em]">Entrar na pelada</h1>
      </div>

      <Card className="mx-auto max-w-md">
        {error ? <p className="mb-3 rounded-[11px] bg-[#FBE9E6] p-3 text-sm font-semibold text-ausente">{error}</p> : null}
        {!invite || !valid ? (
          <p className="rounded-[13px] border-[1.5px] border-ausente/40 bg-ausente/5 p-3 text-sm font-semibold text-ausente">
            Este convite é inválido, foi revogado ou já expirou.
          </p>
        ) : (
          <>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[#EAF5EC] px-3 py-1 text-xs font-bold text-campo">
              <Check size={13} /> CONVITE VÁLIDO
            </span>
            <div className="mb-4 flex items-center gap-3">
              <PeladaCrest size={52} />
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-bold">{invite.pelada.name}</h2>
                <p className="text-xs text-musgo">
                  {invite.pelada._count.memberships} jogadores
                  {presidente ? ` · Presidente: ${presidente.user.name || presidente.user.email}` : ""}
                </p>
              </div>
            </div>
            {/* Logged-in users with an active session already redirected to /entrar above. */}
            <div className="space-y-3">
              <p className="rounded-[13px] bg-areia p-3 text-sm font-semibold text-musgo">
                Para entrar, crie uma conta ou entre com a sua propria conta. O convite sera vinculado ao seu perfil.
              </p>
              <Link
                href={loginHref}
                className="flex w-full items-center justify-center rounded-[13px] bg-campo px-4 py-3 text-sm font-bold text-white shadow-button transition active:scale-[.98]"
              >
                  Criar conta ou entrar
              </Link>
            </div>
          </>
        )}
      </Card>
    </AppShell>
  );
}
