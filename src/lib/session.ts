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
