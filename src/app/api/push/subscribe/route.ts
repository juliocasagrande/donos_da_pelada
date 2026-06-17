import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type PushSubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  const user = await requireUser();
  const body = (await request.json()) as PushSubscriptionBody;

  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return NextResponse.json({ error: "Inscricao de notificacao invalida." }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    update: {
      userId: user.id,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: request.headers.get("user-agent")
    },
    create: {
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent: request.headers.get("user-agent")
    }
  });

  return NextResponse.json({ ok: true });
}
