import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ACTIVE_PELADA_COOKIE = "pelada_id";

export function isPeladaAdmin(user: { role: string; peladaRole?: string | null } | null | undefined) {
  if (!user) return false;
  return user.role === "MASTER" || user.peladaRole === "PRESIDENTE" || user.peladaRole === "ADMIN";
}

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const cookieStore = await cookies();
  const requestedPeladaId = cookieStore.get(ACTIVE_PELADA_COOKIE)?.value;

  const [dbUser, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        active: true,
        onboarded: true,
        pushNotificationsEnabled: true,
        pushPromptDismissed: true,
        radarEnabled: true,
        radarRadiusKm: true,
        latitude: true,
        longitude: true,
        plan: true,
        proRenewsAt: true
      }
    }),
    prisma.peladaMembership.findMany({
      where: { userId: session.user.id },
      select: {
        peladaId: true,
        role: true,
        createdAt: true,
        pelada: { select: { id: true, name: true, _count: { select: { memberships: true } } } }
      },
      orderBy: { createdAt: "asc" }
    })
  ]);
  if (!dbUser) return null;

  const membership = memberships.find((item) => item.peladaId === requestedPeladaId) ?? memberships[0] ?? null;

  const linkedPlayer = membership
    ? await prisma.player.findFirst({
        where: { userId: session.user.id, peladaId: membership.peladaId },
        select: { id: true, active: true, membershipStatus: true }
      })
    : null;
  const hasPlayerProfile = Boolean(linkedPlayer);
  const effectivePeladaRole =
    membership?.role === "ADMIN" && (!linkedPlayer?.active || linkedPlayer.membershipStatus !== "MENSALISTA")
      ? "JOGADOR"
      : membership?.role ?? null;

  return {
    ...session.user,
    ...dbUser,
    peladaId: membership?.peladaId ?? null,
    peladaRole: effectivePeladaRole,
    hasPlayerProfile,
    shellMemberships: memberships.map((item) => ({ role: item.role, pelada: item.pelada }))
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");
  if (!user.peladaId) redirect("/peladas");
  if (!user.hasPlayerProfile && !isPeladaAdmin(user)) redirect("/perfil/onboarding");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isPeladaAdmin(user)) redirect("/dashboard");
  return user;
}

export async function requireMaster() {
  const user = await requireUser();
  if (user.role !== "MASTER") redirect("/dashboard");
  return user;
}

export async function requirePeladaMembership(peladaId: string) {
  const user = await requireUser();
  const membership = await prisma.peladaMembership.findUnique({
    where: { userId_peladaId: { userId: user.id, peladaId } }
  });
  if (!membership) redirect("/dashboard");
  return { user, membership };
}

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Like requireUser, but for API Route Handlers: redirect() only works inside
 * Server Components/Actions, so here we throw instead, letting the route
 * return a proper JSON error response.
 */
export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user || !user.active) {
    throw new ApiAuthError("Sessao invalida. Faca login novamente.", 401);
  }
  return user;
}

export async function requireApiAdmin() {
  const user = await requireApiUser();
  if (!isPeladaAdmin(user)) {
    throw new ApiAuthError("Acesso restrito a administradores.", 403);
  }
  return user;
}
