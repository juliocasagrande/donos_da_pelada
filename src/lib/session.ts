import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, active: true, onboarded: true }
  });
  if (!dbUser) return null;

  return { ...session.user, ...dbUser };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user || !user.active) redirect("/login");
  if (!user.onboarded && user.role === "PLAYER") redirect("/onboarding");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "MASTER" && user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function requireMaster() {
  const user = await requireUser();
  if (user.role !== "MASTER") redirect("/dashboard");
  return user;
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
  if (user.role !== "MASTER" && user.role !== "ADMIN") {
    throw new ApiAuthError("Acesso restrito a administradores.", 403);
  }
  return user;
}
