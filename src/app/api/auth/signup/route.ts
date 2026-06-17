import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (name.length < 2) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Informe um e-mail valido." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ja existe uma conta com este e-mail." }, { status: 409 });
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: UserRole.PLAYER,
      active: true,
      onboarded: false
    }
  });

  return NextResponse.json({ ok: true });
}
