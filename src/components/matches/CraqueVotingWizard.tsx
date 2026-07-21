"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PlayerAvatar } from "@/components/players/PlayerAvatar";
import { OwnMatchStatsForm } from "@/components/matches/OwnMatchStatsForm";
import { VoteCraqueForm } from "@/components/matches/VoteCraqueForm";
import { RatePlayerForm } from "@/components/matches/RatePlayerForm";
import { cn } from "@/lib/utils";

type Candidate = {
  id: string;
  nickname: string;
  photoUrl: string | null;
  position: string;
  summary: string;
  averageRating: number | null;
  viewerRating?: number | null;
};

type RankedCandidate = Candidate & { rankValue: number; rankLabel: string };
type OwnRank = { rank: number; label: string } | null;

type CraqueVotingWizardProps = {
  matchId: string;
  pollId: string;
  ownStats: { goals: number; assists: number; defenses: number };
  initialStatsSent: boolean;
  initialVotedPlayerId: string | null;
  candidates: Candidate[];
  isAdmin: boolean;
  votingOpen: boolean;
  finalResults: {
    topVoted: RankedCandidate[];
    ownVoteRank: OwnRank;
    topScorers: RankedCandidate[];
    ownScorerRank: OwnRank;
  } | null;
};

function WizardNav({
  onBack,
  onNext,
  nextFormId,
  nextDisabled,
  nextLabel = "Avancar"
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextFormId?: string;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-4 flex items-center gap-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-card bg-areia px-3 py-2.5 text-sm font-bold text-mata"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
      ) : null}
      {onNext || nextFormId ? (
        <button
          type={nextFormId ? "submit" : "button"}
          form={nextFormId}
          onClick={nextFormId ? undefined : onNext}
          disabled={nextDisabled}
          className="flex flex-1 items-center justify-center gap-1 rounded-card bg-campo py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {nextLabel} <ChevronRight size={16} />
        </button>
      ) : null}
    </div>
  );
}

function RankedList({
  title,
  items,
  badgeClassName,
  ownRank
}: {
  title: string;
  items: RankedCandidate[];
  badgeClassName: string;
  ownRank: OwnRank;
}) {
  if (!items.length) return null;
  return (
    <div className="mb-4">
      <h3 className="mb-2 font-display text-base font-extrabold">{title}</h3>
      <div className="space-y-2">
        {items.map((player, index) => (
          <div key={player.id} className="flex items-center gap-3 rounded-card bg-areia p-3">
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black", badgeClassName)}>
              {index + 1}o
            </span>
            <PlayerAvatar src={player.photoUrl} name={player.nickname} position={player.position} />
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-extrabold">{player.nickname}</h4>
              <p className="text-xs text-musgo">{player.rankLabel}</p>
            </div>
          </div>
        ))}
      </div>
      {ownRank ? (
        <p className="mt-2 text-xs font-semibold text-musgo">
          Voce esta em {ownRank.rank}o lugar - {ownRank.label}.
        </p>
      ) : null}
    </div>
  );
}

export function CraqueVotingWizard({
  matchId,
  pollId,
  ownStats,
  initialStatsSent,
  initialVotedPlayerId,
  candidates,
  isAdmin,
  votingOpen,
  finalResults
}: CraqueVotingWizardProps) {
  const steps = useMemo(() => (isAdmin ? ["stats", "vote", "rate", "done"] : ["stats", "vote", "done"]), [isAdmin]);
  const initialStep = !initialStatsSent ? 0 : !initialVotedPlayerId ? 1 : isAdmin ? 2 : steps.length - 1;
  const [step, setStep] = useState(initialStep);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [statsSent, setStatsSent] = useState(initialStatsSent);
  const [votedPlayerId, setVotedPlayerId] = useState(initialVotedPlayerId);

  const votedPlayer = candidates.find((candidate) => candidate.id === votedPlayerId);
  const contentSteps = steps.length - 1;
  const rateStepIndex = isAdmin ? 2 : -1;
  const doneStepIndex = steps.length - 1;

  function goTo(nextStep: number) {
    setDirection(nextStep >= step ? "forward" : "backward");
    setStep(nextStep);
  }

  if (!votingOpen) {
    return (
      <Card className="border-2 border-campo p-4">
        <p className="mb-1 font-jersey text-xs font-bold uppercase tracking-[.12em] text-campo">Resultado final</p>
        <h2 className="mb-1 font-display text-xl font-extrabold">Votacao encerrada</h2>
        <p className="mb-4 text-sm text-musgo">
          Seus numeros ficaram salvos{votedPlayer ? ` e voce votou em ${votedPlayer.nickname}` : ""}.
        </p>
        {finalResults ? (
          <>
            <RankedList
              title="Top 3 mais votados no craque"
              items={finalResults.topVoted}
              badgeClassName="bg-craque text-mata"
              ownRank={finalResults.ownVoteRank}
            />
            <RankedList
              title="Top 3 artilheiros da pelada"
              items={finalResults.topScorers}
              badgeClassName="bg-campo text-white"
              ownRank={finalResults.ownScorerRank}
            />
          </>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-2 border-campo p-0">
      <div className="flex items-center justify-center gap-1.5 border-b border-linha bg-areia py-2.5">
        {steps.map((key, index) => (
          <span
            key={key}
            className={cn(
              "h-1.5 rounded-full transition-all",
              index === step ? "w-6 bg-campo" : index < step ? "w-1.5 bg-campo/50" : "w-1.5 bg-linha"
            )}
          />
        ))}
      </div>

      <div key={step} className={cn("p-4", direction === "forward" ? "slide-in-right" : "slide-in-left")}>
        {steps[step] === "stats" ? (
          <>
            <p className="mb-1 font-jersey text-xs font-bold uppercase tracking-[.12em] text-campo">
              Passo 1 de {contentSteps}
            </p>
            <h2 className="font-display text-xl font-extrabold">Seus numeros na pelada</h2>
            <p className="mb-3 text-sm text-musgo">Informe seus gols, assistencias e defesas para continuar.</p>
            <OwnMatchStatsForm
              matchId={matchId}
              goals={ownStats.goals}
              assists={ownStats.assists}
              defenses={ownStats.defenses}
              saved={statsSent}
              formId="wizard-own-stats-form"
              hideSubmitButton={!statsSent}
              onSaved={() => {
                setStatsSent(true);
                goTo(1);
              }}
            />
            {statsSent ? (
              <WizardNav onNext={() => goTo(1)} nextLabel="Avancar para o voto" />
            ) : (
              <WizardNav nextFormId="wizard-own-stats-form" nextLabel="Salvar e avancar" />
            )}
          </>
        ) : null}

        {steps[step] === "vote" ? (
          <>
            <p className="mb-1 font-jersey text-xs font-bold uppercase tracking-[.12em] text-campo">
              Passo 2 de {contentSteps}
            </p>
            <h2 className="font-display text-xl font-extrabold">Vote no craque</h2>
            <p className="mb-3 text-sm text-musgo">Escolha quem foi o craque da pelada.</p>
            <div className="space-y-2">
              {candidates.map((candidate) => {
                const selected = votedPlayerId === candidate.id;
                return (
                  <div
                    key={candidate.id}
                    className={cn(
                      "flex items-center gap-3 rounded-card border-[1.5px] p-3",
                      selected ? "border-campo bg-[#EAF5EC]" : "border-linha bg-white"
                    )}
                  >
                    <PlayerAvatar src={candidate.photoUrl} name={candidate.nickname} position={candidate.position} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-extrabold">{candidate.nickname}</h3>
                      <p className="text-xs text-musgo">
                        {candidate.summary} · nota {candidate.averageRating?.toFixed(1) ?? "-"}
                      </p>
                    </div>
                    {selected ? (
                      <span className="rounded-[10px] bg-campo px-3 py-2 text-xs font-bold text-white">Seu voto</span>
                    ) : (
                      <VoteCraqueForm
                        pollId={pollId}
                        playerId={candidate.id}
                        hasVoted={Boolean(votedPlayerId)}
                        onVoted={() => setVotedPlayerId(candidate.id)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <WizardNav
              onBack={() => goTo(0)}
              onNext={() => goTo(rateStepIndex >= 0 ? rateStepIndex : doneStepIndex)}
              nextDisabled={!votedPlayerId}
              nextLabel={votedPlayerId ? (isAdmin ? "Avancar para as notas" : "Concluir") : "Vote para continuar"}
            />
          </>
        ) : null}

        {steps[step] === "rate" ? (
          <>
            <p className="mb-1 font-jersey text-xs font-bold uppercase tracking-[.12em] text-campo">
              Passo 3 de {contentSteps} - opcional
            </p>
            <h2 className="font-display text-xl font-extrabold">Avaliar jogadores</h2>
            <p className="mb-3 text-sm text-musgo">De uma nota pra quem jogou. Voce pode pular essa parte.</p>
            <div className="space-y-2">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="rounded-card border-[1.5px] border-linha bg-white p-3">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar src={candidate.photoUrl} name={candidate.nickname} position={candidate.position} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-extrabold">{candidate.nickname}</h3>
                      <p className="text-xs text-musgo">Nota media {candidate.averageRating?.toFixed(1) ?? "-"}</p>
                    </div>
                  </div>
                  {candidate.viewerRating == null ? (
                    <RatePlayerForm matchId={matchId} playerId={candidate.id} defaultValue={3} />
                  ) : (
                    <p className="mt-3 rounded-[10px] bg-areia px-3 py-2 text-xs font-bold text-musgo">
                      Sua nota: {candidate.viewerRating.toFixed(1)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <WizardNav onBack={() => goTo(1)} onNext={() => goTo(doneStepIndex)} nextLabel="Concluir" />
          </>
        ) : null}

        {steps[step] === "done" ? (
          <>
            <p className="mb-1 font-jersey text-xs font-bold uppercase tracking-[.12em] text-campo">Prontinho</p>
            <h2 className="font-display text-xl font-extrabold">Tudo certo por aqui</h2>
            <p className="mb-4 text-sm text-musgo">
              Seus numeros foram salvos{votedPlayer ? ` e voce votou em ${votedPlayer.nickname}` : ""}. Voce pode ajustar
              qualquer coisa ate a votacao fechar.
            </p>

            {finalResults ? (
              <>
                <p className="mb-2 text-xs font-bold uppercase text-musgo">Parcial ate agora - pode mudar ate fechar</p>
                <RankedList
                  title="Top 3 mais votados no craque"
                  items={finalResults.topVoted}
                  badgeClassName="bg-craque text-mata"
                  ownRank={finalResults.ownVoteRank}
                />
                <RankedList
                  title="Top 3 artilheiros da pelada"
                  items={finalResults.topScorers}
                  badgeClassName="bg-campo text-white"
                  ownRank={finalResults.ownScorerRank}
                />
              </>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => goTo(0)}
                className="rounded-card bg-areia px-3 py-2 text-xs font-bold text-mata"
              >
                Editar numeros
              </button>
              <button
                type="button"
                onClick={() => goTo(1)}
                className="rounded-card bg-areia px-3 py-2 text-xs font-bold text-mata"
              >
                Trocar voto
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => goTo(2)}
                  className="rounded-card bg-areia px-3 py-2 text-xs font-bold text-mata"
                >
                  Avaliar jogadores
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
