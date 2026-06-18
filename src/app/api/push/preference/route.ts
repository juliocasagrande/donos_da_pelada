import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiAuthError, requireApiUser } from "@/lib/session";

type PreferenceBody = {
  enabled?: boolean;
};

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const body = (await request.json()) as PreferenceBody;
    const enabled = Boolean(body.enabled);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          pushNotificationsEnabled: enabled,
          pushPromptDismissed: true
        }
      }),
      ...(enabled ? [] : [prisma.pushSubscription.deleteMany({ where: { userId: user.id } })])
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Push preference failed:", error);
    return NextResponse.json({ error: "Nao foi possivel salvar a preferencia." }, { status: 500 });
  }
}
