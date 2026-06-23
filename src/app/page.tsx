import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/LandingPage";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dono da Pelada — transforme sua pelada em jogo de craques",
  description:
    "App de gestão de futebol amador: sorteio de times balanceados, ranking de estatísticas, votação de craque da pelada, radar de peladas, convites e presenças. Crie sua conta grátis."
};

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return <LandingPage />;
}
