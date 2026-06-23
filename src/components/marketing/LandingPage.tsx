import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  Instagram,
  Radar,
  Shuffle,
  Star,
  Trophy
} from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";

function HeroCopy({ align = "left" }: { align?: "left" | "center" }) {
  const centered = align === "center";
  return (
    <>
      <Reveal from={centered ? "up" : "left"}>
        <span className="inline-flex items-center gap-2 rounded-full border border-linha bg-white/85 px-3.5 py-1.5 font-jersey text-xs font-semibold uppercase tracking-[.16em] text-campo shadow-card backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-campo pulse-dot" />
          Futebol sem planilha
        </span>
      </Reveal>
      <Reveal from={centered ? "up" : "left"} delay={90}>
        <h1
          className={`mt-5 font-display font-extrabold leading-[1.04] tracking-[-.02em] text-tinta drop-shadow-[0_1px_2px_rgba(241,244,237,.85)] ${
            centered ? "text-[34px]" : "text-[clamp(1.75rem,3.4vw,3.5rem)]"
          }`}
        >
          Transforme sua pelada
          <br />
          em jogo de <span className="text-campo">craques</span>
        </h1>
      </Reveal>
      <Reveal from={centered ? "up" : "left"} delay={160}>
        <p
          className={`mt-4 max-w-md leading-relaxed text-tinta/80 ${
            centered ? "mx-auto text-[15px]" : "text-[clamp(0.9rem,1.15vw,1.0625rem)]"
          }`}
        >
          Organize convites, presenças, escalação, sorteio de times, votação de craque e
          rankings — tudo em um só app, direto do celular.
        </p>
      </Reveal>
      <Reveal from={centered ? "up" : "left"} delay={230}>
        <div className={`mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center ${centered ? "justify-center" : "justify-start"}`}>
          <Link
            href="/login?signup=1"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-craque px-6 py-3.5 text-base font-bold text-tinta shadow-[0_12px_26px_rgba(244,161,26,.34)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(244,161,26,.42)] active:scale-[.98]"
          >
            Teste grátis
            <ArrowRight size={19} strokeWidth={2.5} />
          </Link>
          <a
            href="#funcionalidades"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-linha bg-white px-6 py-3.5 text-base font-semibold text-tinta transition hover:-translate-y-0.5 hover:bg-areia active:scale-[.98]"
          >
            Ver como funciona
          </a>
        </div>
      </Reveal>
      <Reveal from={centered ? "up" : "left"} delay={300}>
        <p className={`mt-4 flex items-center gap-1.5 text-[13px] text-musgo ${centered ? "justify-center" : "justify-start"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-campo" />
          Sem cartão para testar
        </p>
      </Reveal>
    </>
  );
}

type Feature = {
  icon: typeof Shuffle;
  title: string;
  desc: string;
  tint: string;
  iconColor: string;
};

const features: Feature[] = [
  {
    icon: Shuffle,
    title: "Sorteio de times",
    desc: "Times equilibrados em segundos, considerando o nível de cada jogador. Acabou a discussão na hora de dividir.",
    tint: "bg-[#EAF5EC]",
    iconColor: "text-campo"
  },
  {
    icon: Trophy,
    title: "Ranking de estatísticas",
    desc: "Gols, assistências, presenças e vitórias de cada um. O artilheiro e o garçom da pelada na ponta dos dedos.",
    tint: "bg-[#FCEFD6]",
    iconColor: "text-[#C58207]"
  },
  {
    icon: Star,
    title: "Craque da pelada",
    desc: "A galera vota e elege o melhor de cada rodada. Reconhecimento de craque pra quem brilhou em campo.",
    tint: "bg-[#FCEFD6]",
    iconColor: "text-[#C58207]"
  },
  {
    icon: Radar,
    title: "Radar de peladas",
    desc: "Encontre peladas perto de você, peça pra entrar e nunca mais fique sem jogo no fim de semana.",
    tint: "bg-[#EAF5EC]",
    iconColor: "text-campo"
  },
  {
    icon: CalendarCheck,
    title: "Convites e presenças",
    desc: "Marque o jogo, dispare o convite e confirme quem vai. Você sempre sabe quantos têm em campo.",
    tint: "bg-[#EAF5EC]",
    iconColor: "text-campo"
  },
  {
    icon: ClipboardList,
    title: "Súmula e escalação",
    desc: "Registre gols e resultados, monte a escalação e mantenha o histórico de todas as rodadas guardado.",
    tint: "bg-[#FCEFD6]",
    iconColor: "text-[#C58207]"
  }
];

const steps = [
  {
    n: "1",
    title: "Crie sua pelada",
    desc: "Monte seu grupo em um minuto e vire o presidente. Sem planilha, sem grupo bagunçado no zap."
  },
  {
    n: "2",
    title: "Convide a galera",
    desc: "Mande o link ou código de convite. Cada um cria seu perfil e confirma presença nos jogos."
  },
  {
    n: "3",
    title: "Jogue e registre",
    desc: "Sorteie os times, anote os gols e veja o ranking subir. A pelada vira história rodada após rodada."
  }
];

function LogoMark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-craque shadow-[0_8px_18px_rgba(244,161,26,.32)]">
        <span className="relative h-5 w-5 rounded-full border-[2.5px] border-mata">
          <span className="absolute left-[-2.5px] right-[-2.5px] top-1/2 h-[2.5px] -translate-y-1/2 bg-mata" />
        </span>
      </span>
      <span className="font-display text-lg font-extrabold tracking-[-.02em] text-tinta">Dono da Pelada</span>
    </span>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-areia text-tinta">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-linha/70 bg-areia/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <LogoMark />
          <nav className="hidden items-center gap-7 text-sm font-semibold text-musgo md:flex">
            <a href="#funcionalidades" className="transition hover:text-tinta">Funcionalidades</a>
            <a href="#como-funciona" className="transition hover:text-tinta">Como funciona</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <a
              href="https://www.instagram.com/donosdapelada"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Siga @donosdapelada no Instagram"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[13px] text-musgo transition hover:bg-white hover:text-campo sm:hidden"
            >
              <Instagram size={20} strokeWidth={2} />
            </a>
            <a
              href="https://www.instagram.com/donosdapelada"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-[13px] px-3 py-2.5 text-sm font-semibold text-musgo transition hover:bg-white hover:text-campo sm:inline-flex"
            >
              <Instagram size={18} strokeWidth={2} />
              @donosdapelada
            </a>
            <Link
              href="/login"
              className="hidden rounded-[13px] px-4 py-2.5 text-sm font-semibold text-tinta transition hover:bg-white sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/login?signup=1"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[13px] bg-campo px-4 py-2.5 text-sm font-semibold text-white shadow-button transition active:scale-[.98]"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Desktop/tablet: imagem inteira ocupando toda a largura + texto sobreposto */}
        <div className="relative hidden md:block">
          <img
            src="/hero-bg.png"
            alt="Craques do futebol brasileiro ao lado do app Dono da Pelada"
            className="block h-auto w-full"
            width={1672}
            height={941}
          />
          {/* Clareia o lado esquerdo para leitura do texto, sem cobrir os craques */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(241,244,237,.97)_0%,rgba(241,244,237,.6)_32%,rgba(241,244,237,0)_56%)]"
          />
          <div className="absolute inset-0 flex items-center">
            <div className="w-[48%] pl-[5vw] pr-6">
              <HeroCopy align="left" />
            </div>
          </div>
        </div>

        {/* Mobile: imagem inteira full-width em cima, texto logo abaixo */}
        <div className="md:hidden">
          <img
            src="/hero-bg.png"
            alt="Craques do futebol brasileiro ao lado do app Dono da Pelada"
            className="block h-auto w-full"
            width={1672}
            height={941}
          />
          <div className="px-5 pb-2 pt-7 text-center">
            <HeroCopy align="center" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="relative overflow-hidden">
        <div aria-hidden="true" className="float-soft pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-campo/10 blur-3xl" />
        <div aria-hidden="true" className="float-soft-alt pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-craque/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="font-jersey text-xs font-semibold uppercase tracking-[.16em] text-campo">
              Tudo em um só lugar
            </span>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-.02em] text-tinta sm:text-[38px]">
              Tudo que a pelada precisa
            </h2>
            <p className="mt-3 text-[15px] text-musgo sm:text-base">
              Da convocação ao apito final: o app cuida da organização pra galera focar no que importa — jogar.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal
                  key={feature.title}
                  delay={(index % 3) * 90}
                  className="group rounded-2xl border border-linha bg-white p-5 shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-campo/30 hover:shadow-[0_18px_44px_rgba(11,74,41,.12)]"
                >
                  <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] ${feature.tint} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}>
                    <Icon size={24} strokeWidth={2} className={feature.iconColor} />
                  </span>
                  <h3 className="font-display text-lg font-bold text-tinta">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-musgo">{feature.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="border-y border-linha bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="font-jersey text-xs font-semibold uppercase tracking-[.16em] text-campo">
              Comece em 3 passos
            </span>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-.02em] text-tinta sm:text-[38px]">
              Como funciona
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal
                key={step.n}
                delay={index * 120}
                from="up"
                className="group relative rounded-2xl border border-linha bg-areia/60 p-6 transition duration-300 hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_18px_44px_rgba(11,74,41,.1)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-campo font-jersey text-2xl font-bold text-white shadow-button transition-transform duration-300 group-hover:scale-110">
                  {step.n}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-tinta">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-musgo">{step.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-16 sm:py-20">
        <Reveal from="zoom" className="field-hero relative mx-auto block max-w-5xl overflow-hidden rounded-[28px] px-6 py-14 text-center text-white sm:py-16">
          <span className="soccer-ball soccer-ball-float absolute right-8 top-8 hidden h-12 w-12 opacity-90 sm:inline-block" aria-hidden="true" />
          <span className="soccer-ball soccer-ball-roll absolute bottom-6 left-10 hidden h-8 w-8 opacity-80 sm:inline-block" aria-hidden="true" />
          <h2 className="relative z-10 mx-auto max-w-xl font-display text-3xl font-extrabold leading-[1.1] tracking-[-.02em] sm:text-[40px]">
            Pronto pra ser o dono da pelada?
          </h2>
          <p className="relative z-10 mx-auto mt-3 max-w-md text-[15px] text-green-100 sm:text-base">
            Crie sua conta grátis e organize a próxima rodada hoje mesmo.
          </p>
          <Link
            href="/login?signup=1"
            className="relative z-10 mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-craque px-7 py-3.5 text-base font-bold text-tinta shadow-[0_14px_30px_rgba(0,0,0,.25)] transition active:scale-[.98]"
          >
            Criar conta grátis
            <ArrowRight size={19} strokeWidth={2.5} />
          </Link>
          <p className="relative z-10 mt-4 text-[13px] text-green-200">Sem cartão para testar</p>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-linha bg-areia">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <LogoMark />
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/donosdapelada"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Siga @donosdapelada no Instagram"
              className="inline-flex items-center gap-2 rounded-[13px] border border-linha bg-white px-3.5 py-2 text-sm font-semibold text-tinta transition hover:-translate-y-0.5 hover:border-campo/40 hover:text-campo"
            >
              <Instagram size={18} strokeWidth={2} />
              @donosdapelada
            </a>
            <p className="text-[13px] text-musgo">
              © {new Date().getFullYear()} Dono da Pelada
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
