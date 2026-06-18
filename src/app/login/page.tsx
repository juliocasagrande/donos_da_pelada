import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { LoginPanel } from "@/components/forms/LoginPanel";
import { DeveloperCredit } from "@/components/layout/DeveloperCredit";
import { getCurrentUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const socialProviders = [
    process.env.GOOGLE_CLIENT_ID ? "google" : "",
    process.env.FACEBOOK_CLIENT_ID ? "facebook" : "",
    process.env.INSTAGRAM_CLIENT_ID ? "instagram" : ""
  ].filter(Boolean);

  return (
    <main className="min-h-screen overflow-hidden bg-areia text-tinta">
      <section className="field-hero h-[185px] px-6 pt-5 text-center text-white">
        <span className="soccer-ball soccer-ball-float absolute right-8 top-7 h-11 w-11 opacity-95" aria-hidden="true" />
        <span className="soccer-ball soccer-ball-roll absolute bottom-4 left-1/2 h-7 w-7 opacity-90" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-[18px] bg-craque shadow-[0_10px_24px_rgba(244,161,26,.32)]">
          <div className="relative h-9 w-9 rounded-full border-[3px] border-mata">
            <div className="absolute left-[-3px] right-[-3px] top-1/2 h-[3px] -translate-y-1/2 bg-mata" />
          </div>
        </div>
        <h1 className="relative z-10 mt-2 font-display text-[25px] font-extrabold tracking-[-.02em]">Dono da Pelada</h1>
        <p className="relative z-10 mt-0.5 font-jersey text-xs font-semibold uppercase tracking-[.16em] text-green-200">
          Futebol sem planilha
        </p>
      </section>
      <section className="relative z-10 flex min-h-[calc(100vh-185px)] items-center px-5 py-4">
        <div className="mx-auto w-full max-w-md">
          <Card className="rounded-[22px] p-4 shadow-[0_12px_40px_rgba(17,40,28,.10)]">
            <LoginPanel socialProviders={socialProviders} />
          </Card>
          <DeveloperCredit className="mt-4" />
        </div>
      </section>
    </main>
  );
}
