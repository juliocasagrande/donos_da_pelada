import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestIp";
import { signupSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados invalidos." }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const clientIp = getClientIp(request.headers);
  const [ipLimit, accountLimit] = await Promise.all([
    checkRateLimit(rateLimitKey("signup-ip", clientIp), 10, 60 * 60 * 1000),
    checkRateLimit(rateLimitKey("signup-account", email), 5, 10 * 60 * 1000)
  ]);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em alguns minutos." }, { status: 429 });
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
