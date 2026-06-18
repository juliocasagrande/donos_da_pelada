"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ACTIVE_PELADA_COOKIE, requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function setActivePelada(peladaId: string) {
  const user = await requireUser();
  const membership = await prisma.peladaMembership.findUnique({
    where: { userId_peladaId: { userId: user.id, peladaId } }
  });
  if (!membership) return;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_PELADA_COOKIE, peladaId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  revalidatePath("/");
}
