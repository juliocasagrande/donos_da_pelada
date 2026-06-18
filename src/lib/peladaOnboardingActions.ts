"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PeladaRole } from "@prisma/client";
import { ACTIVE_PELADA_COOKIE, getCurrentUser, requireAdmin } from "@/lib/session";
import { createPeladaWithTrial } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "pelada";
  let slug = base;
  let attempt = 0;
  while (await prisma.pelada.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

async function setActivePeladaCookie(peladaId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PELADA_COOKIE, peladaId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
}

export async function createPeladaAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");

  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/peladas/criar?error=Informe%20um%20nome");
  const existingName = await prisma.pelada.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true }
  });
  if (existingName) {
    redirect(`/peladas/criar?error=${encodeURIComponent("Ja existe uma pelada com esse nome. Use outro nome para evitar confusao na busca.")}`);
  }

  const slug = await uniqueSlug(name);
  const pelada = await createPeladaWithTrial({ name, slug, createdByUserId: user.id });
  await prisma.peladaMembership.create({
    data: { userId: user.id, peladaId: pelada.id, role: PeladaRole.PRESIDENTE }
  });
  await setActivePeladaCookie(pelada.id);
  redirect("/perfil/onboarding");
}

export async function createInvite(formData: FormData) {
  const admin = await requireAdmin();
  const maxUsesRaw = String(formData.get("maxUses") || "").trim();
  const maxUses = maxUsesRaw ? Math.max(1, Number(maxUsesRaw)) : null;

  await prisma.peladaInvite.create({
    data: { peladaId: admin.peladaId!, role: PeladaRole.JOGADOR, maxUses, createdByUserId: admin.id }
  });

  revalidatePath("/admins/convites");
}

export async function revokeInvite(inviteId: string) {
  const admin = await requireAdmin();
  await prisma.peladaInvite.updateMany({
    where: { id: inviteId, peladaId: admin.peladaId! },
    data: { revokedAt: new Date() }
  });
  revalidatePath("/admins/convites");
}

export async function acceptInvite(code: string) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect(`/login?callbackUrl=${encodeURIComponent(`/convite/${code}`)}`);

  const invite = await prisma.peladaInvite.findUnique({ where: { code } });
  const valid =
    invite &&
    !invite.revokedAt &&
    (!invite.expiresAt || invite.expiresAt > new Date()) &&
    (invite.maxUses == null || invite.usedCount < invite.maxUses);

  if (!invite || !valid) {
    redirect(`/convite/${code}?error=Convite%20invalido%20ou%20expirado`);
  }

  const existing = await prisma.peladaMembership.findUnique({
    where: { userId_peladaId: { userId: user.id, peladaId: invite.peladaId } }
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.peladaMembership.create({
        data: { userId: user.id, peladaId: invite.peladaId, role: PeladaRole.JOGADOR }
      }),
      prisma.peladaInvite.update({ where: { id: invite.id }, data: { usedCount: { increment: 1 } } })
    ]);
  }

  await setActivePeladaCookie(invite.peladaId);
  redirect("/perfil/onboarding");
}

export async function requestJoinPelada(peladaId: string) {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");

  const existingMembership = await prisma.peladaMembership.findUnique({
    where: { userId_peladaId: { userId: user.id, peladaId } }
  });
  if (existingMembership) {
    redirect("/peladas");
  }

  await prisma.peladaJoinRequest.upsert({
    where: { peladaId_userId: { peladaId, userId: user.id } },
    update: { status: "PENDING" },
    create: { peladaId, userId: user.id, status: "PENDING" }
  });

  revalidatePath("/peladas/buscar");
}

export async function approveJoinRequest(requestId: string) {
  const admin = await requireAdmin();
  const request = await prisma.peladaJoinRequest.findFirst({
    where: { id: requestId, peladaId: admin.peladaId! }
  });
  if (!request) return;

  await prisma.$transaction([
    prisma.peladaMembership.upsert({
      where: { userId_peladaId: { userId: request.userId, peladaId: request.peladaId } },
      update: {},
      create: { userId: request.userId, peladaId: request.peladaId, role: PeladaRole.JOGADOR }
    }),
    prisma.peladaJoinRequest.update({ where: { id: requestId }, data: { status: "APPROVED" } })
  ]);

  revalidatePath("/admins/solicitacoes");
}

export async function rejectJoinRequest(requestId: string) {
  const admin = await requireAdmin();
  await prisma.peladaJoinRequest.updateMany({
    where: { id: requestId, peladaId: admin.peladaId! },
    data: { status: "REJECTED" }
  });
  revalidatePath("/admins/solicitacoes");
}
