import { NextResponse } from "next/server";
import { PeladaRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiAuthError, requireApiAdmin } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const admin = await requireApiAdmin();
    const body = (await request.json().catch(() => ({}))) as { matchId?: string };

    if (body.matchId) {
      const match = await prisma.match.findFirst({
        where: { id: body.matchId, peladaId: admin.peladaId!, deletedAt: null },
        select: { id: true }
      });

      if (!match) {
        return NextResponse.json({ error: "Pelada nao encontrada." }, { status: 404 });
      }
    }

    const invites = await prisma.peladaInvite.findMany({
      where: { peladaId: admin.peladaId!, revokedAt: null },
      orderBy: { createdAt: "desc" }
    });
    const reusableInvite = invites.find((invite) => {
      const notExpired = !invite.expiresAt || invite.expiresAt > new Date();
      const hasUses = invite.maxUses == null || invite.usedCount < invite.maxUses;
      return notExpired && hasUses;
    });

    const invite =
      reusableInvite ??
      (await prisma.peladaInvite.create({
        data: { peladaId: admin.peladaId!, role: PeladaRole.JOGADOR, createdByUserId: admin.id }
      }));

    return NextResponse.json({ code: invite.code });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Nao foi possivel gerar o convite." }, { status: 500 });
  }
}
