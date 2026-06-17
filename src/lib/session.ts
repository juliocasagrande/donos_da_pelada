import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
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
