import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiAuthError, requireApiUser } from "@/lib/session";

export async function POST() {
  try {
    const user = await requireApiUser();

    await prisma.user.update({
      where: { id: user.id },
      data: { pushPromptDismissed: true }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Push prompt-seen failed:", error);
    return NextResponse.json({ error: "Nao foi possivel salvar a preferencia." }, { status: 500 });
  }
}
