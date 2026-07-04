import Link from "next/link";
import { ArrowLeft, Pencil, Save, Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/forms/ConfirmSubmitButton";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { SeasonDeleteSelect } from "@/components/rankings/SeasonDeleteSelect";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createSeason, deleteSeason, updateSeasonPlayerStats } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

function currentSaoPauloYear() {
  return Number(new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date()));
}

function parseYear(value: string | undefined) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : currentSaoPauloYear();
}

export default async function SeasonStatsPage({
  searchParams
}: {
  searchParams?: Promise<{ ano?: string; salvo?: string; criada?: string; excluida?: string; error?: string; editar?: string }>;
}) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const selectedYear = parseYear(query?.ano);
  const currentYear = currentSaoPauloYear();
  const editingSeasons = query?.editar === "1";

  const [players, seasonStats, seasonYearRows] = await Promise.all([
    prisma.player.findMany({
      where: { peladaId: admin.peladaId!, active: true },
      select: { id: true, nickname: true, photoUrl: true, position: true },
      orderBy: { nickname: "asc" }
    }),
    prisma.seasonPlayerStat.findMany({
      where: { peladaId: admin.peladaId!, year: selectedYear }
    }),
    prisma.seasonPlayerStat.findMany({
      where: { peladaId: admin.peladaId! },
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "asc" }
    })
  ]);

  const existingSeasonYears = seasonYearRows.map((row) => row.year);
  const hasRequestedYear = Boolean(query?.ano);
  const quickYears = Array.from(
    new Set(existingSeasonYears.length ? [...existingSeasonYears, ...(hasRequestedYear ? [selectedYear] : [])] : [selectedYear || currentYear])
  ).sort((a, b) => a - b);
  const suggestedNewYear = (quickYears.length ? Math.max(...quickYears) : currentYear) + 1;
  const statsByPlayerId = new Map(seasonStats.map((stat) => [stat.playerId, stat]));

  return (
    <AppShell>
      <div className="mb-4 flex items-start justify-between gap-3 pt-1">
        <div>
          <Link href="/rankings" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-musgo">
            <ArrowLeft size={14} /> Rankings
          </Link>
          <p className="font-jersey text-sm font-semibold uppercase tracking-[.14em] text-musgo">Admin</p>
          <h1 className="font-display text-3xl font-extrabold tracking-[-.02em]">Temporadas</h1>
          <p className="mt-1 text-sm font-semibold text-musgo">Insira ou ajuste dados historicos dos jogadores cadastrados na pelada.</p>
        </div>
      </div>

      {query?.salvo ? (
        <Card className="mb-3 border border-campo/20 bg-[#EAF5EC] p-3">
          <p className="text-sm font-bold text-mata">Temporada {selectedYear} salva.</p>
        </Card>
      ) : null}
      {query?.criada ? (
        <Card className="mb-3 border border-campo/20 bg-[#EAF5EC] p-3">
          <p className="text-sm font-bold text-mata">Temporada {selectedYear} criada.</p>
        </Card>
      ) : null}
      {query?.excluida ? (
        <Card className="mb-3 border border-campo/20 bg-[#EAF5EC] p-3">
          <p className="text-sm font-bold text-mata">Temporada excluida.</p>
        </Card>
      ) : null}
      {query?.error ? (
        <Card className="mb-3 border border-ausente/20 bg-[#FBE9E6] p-3">
          <p className="text-sm font-bold text-ausente">{query.error}</p>
        </Card>
      ) : null}

      <Card className="mb-4 p-3">
        <p className="mb-2 font-jersey text-xs font-semibold uppercase tracking-[.12em] text-musgo">Temporada</p>
        <div className="flex w-full gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickYears.map((year) => (
            <Link
              key={year}
              href={`/rankings/temporadas?ano=${year}${editingSeasons ? "&editar=1" : ""}`}
              className={cn(
                "flex h-9 min-w-24 flex-1 shrink-0 items-center justify-center rounded-[10px] px-2 text-center text-xs font-bold",
                year === selectedYear ? "bg-campo text-white" : "bg-areia text-musgo"
              )}
            >
              {year}
            </Link>
          ))}
          <Link
            href={editingSeasons ? `/rankings/temporadas?ano=${selectedYear}` : `/rankings/temporadas?ano=${selectedYear}&editar=1`}
            aria-label="Editar temporadas"
            className={cn(
              "flex h-9 min-w-10 flex-[0_0_2.5rem] shrink-0 items-center justify-center rounded-[10px] bg-[#F4A51C] text-white shadow-[0_8px_18px_rgba(244,165,28,.26)] transition active:scale-[.98]",
              editingSeasons && "bg-mata shadow-button"
            )}
          >
            <Pencil size={16} />
          </Link>
        </div>
      </Card>

      {editingSeasons ? (
        <Card className="mb-4 p-3">
          <div className="mb-3">
            <h2 className="text-sm font-extrabold">Editar temporadas</h2>
            <p className="text-xs font-semibold text-musgo">Crie temporadas para lancar dados historicos ou exclua anos cadastrados.</p>
          </div>

          <form action={createSeason} className="mb-4 grid grid-cols-[1fr_auto] gap-2">
            <label className="text-xs font-semibold text-musgo">
              Nova temporada
              <Input name="year" type="number" min={2000} max={2100} defaultValue={suggestedNewYear} required />
            </label>
            <ConfirmSubmitButton
              className="self-end bg-campo text-white shadow-button"
              pendingLabel="Criando..."
              title="Criar temporada"
              confirmLabel="Criar"
              message="Criar esta temporada? Os jogadores ativos da pelada serao adicionados com dados zerados."
            >
              Criar
            </ConfirmSubmitButton>
          </form>

          {existingSeasonYears.length ? (
            <form action={deleteSeason} className="grid grid-cols-[1fr_auto] gap-2 rounded-[12px] bg-areia p-2">
              <SeasonDeleteSelect years={existingSeasonYears} defaultYear={selectedYear} />
              <ConfirmSubmitButton
                className="self-end bg-ausente px-3 text-xs text-white"
                pendingLabel="Excluindo..."
                title="Excluir temporada"
                confirmLabel="Excluir"
                confirmVariant="danger"
                message="Excluir a temporada selecionada? Todos os dados historicos desse ano serao apagados e esta acao nao pode ser desfeita."
              >
                <Trash2 size={14} /> Excluir
              </ConfirmSubmitButton>
            </form>
          ) : (
            <p className="rounded-[12px] bg-areia px-3 py-2 text-sm font-semibold text-musgo">Nenhuma temporada criada ainda.</p>
          )}
        </Card>
      ) : null}

      <form key={`season-stats-${selectedYear}`} action={updateSeasonPlayerStats.bind(null, selectedYear)} className="space-y-3">
        {players.map((player) => {
          const stat = statsByPlayerId.get(player.id);
          return (
            <Card key={`${selectedYear}-${player.id}`} className="p-3">
              <div className="mb-3 flex items-center gap-3">
                <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} size="sm" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-extrabold">{player.nickname}</h2>
                  <p className="text-xs font-semibold text-musgo">Temporada {selectedYear}</p>
                </div>
              </div>
              <input type="hidden" name="playerId" value={player.id} />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-musgo">
                  Gols
                  <Input name={`goals-${player.id}`} type="number" min={0} defaultValue={stat?.goals ?? 0} />
                </label>
                <label className="text-xs font-semibold text-musgo">
                  Assist.
                  <Input name={`assists-${player.id}`} type="number" min={0} defaultValue={stat?.assists ?? 0} />
                </label>
                <label className="text-xs font-semibold text-musgo">
                  Presencas
                  <Input name={`presence-${player.id}`} type="number" min={0} defaultValue={stat?.presence ?? 0} />
                </label>
                <label className="text-xs font-semibold text-musgo">
                  Craques
                  <Input name={`craque-${player.id}`} type="number" min={0} defaultValue={stat?.craque ?? 0} />
                </label>
                <label className="text-xs font-semibold text-musgo">
                  Nota media
                  <Input name={`ratingAverage-${player.id}`} type="number" min={0} max={10} step={0.1} defaultValue={stat?.ratingAverage ?? 0} />
                </label>
                <label className="text-xs font-semibold text-musgo">
                  Jogos avaliados
                  <Input name={`ratingCount-${player.id}`} type="number" min={0} defaultValue={stat?.ratingCount ?? 0} />
                </label>
              </div>
            </Card>
          );
        })}

        {!players.length ? (
          <Card>
            <p className="text-sm text-musgo">Nenhum jogador ativo encontrado para lancar estatisticas.</p>
          </Card>
        ) : null}

        <SubmitButton className="w-full" pendingLabel="Salvando temporada..." disabled={!players.length}>
          <Save size={16} /> Salvar temporada {selectedYear}
        </SubmitButton>
      </form>
    </AppShell>
  );
}