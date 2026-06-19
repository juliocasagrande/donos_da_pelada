import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { ApiAuthError, isPeladaAdmin, requireApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatShortDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return `${parts.day} ${MONTHS[Number(parts.month) - 1]} ${parts.year}`;
}

function SparkleIcon({ color = "#16261D", size = 37 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function CheckIcon({ color = "#9fe3b8", size = 37 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3}>
      <path d="M20 6 9 17l-4-4" />
    </svg>
  );
}

function TrophyIcon({ color = "#16261D", size = 48 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22m7-7.34V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function StarIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill={filled ? color : "rgba(255,255,255,0.18)"}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StatColumn({ value, label, color = "#fff" }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <span style={{ fontFamily: "Saira Condensed", fontWeight: 700, fontSize: "75px", color, lineHeight: 1 }}>{value}</span>
      <span
        style={{
          display: "flex",
          fontFamily: "Saira Condensed",
          fontWeight: 600,
          fontSize: "27px",
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
          marginTop: "11px"
        }}
      >
        {label}
      </span>
    </div>
  );
}

let fontCache: Record<string, ArrayBuffer | null> | null = null;

async function loadGoogleFont(family: string, weight: number) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
  if (!match) throw new Error(`Fonte nao encontrada: ${family} ${weight}`);
  const response = await fetch(match[1]);
  return response.arrayBuffer();
}

async function tryLoadGoogleFont(family: string, weight: number) {
  try {
    return await loadGoogleFont(family, weight);
  } catch (error) {
    console.warn(`Nao foi possivel carregar a fonte ${family} ${weight}, usando fallback.`, error);
    return null;
  }
}

async function getFonts() {
  if (!fontCache) {
    const [bricolage800, bricolage700, saira700, saira600, hanken500] = await Promise.all([
      tryLoadGoogleFont("Bricolage+Grotesque", 800),
      tryLoadGoogleFont("Bricolage+Grotesque", 700),
      tryLoadGoogleFont("Saira+Condensed", 700),
      tryLoadGoogleFont("Saira+Condensed", 600),
      tryLoadGoogleFont("Hanken+Grotesk", 500)
    ]);
    fontCache = { bricolage800, bricolage700, saira700, saira600, hanken500 };
  }
  return fontCache;
}

export async function GET(request: Request, { params }: { params: Promise<{ matchId: string; playerId: string }> }) {
  try {
    const user = await requireApiUser();
    const { matchId, playerId } = await params;

    const [match, player] = await Promise.all([
      prisma.match.findFirst({
        where: { id: matchId, peladaId: user.peladaId!, deletedAt: null },
        include: { pelada: { select: { name: true } } }
      }),
      prisma.player.findFirst({
        where: { id: playerId, peladaId: user.peladaId! },
        include: {
          goals: { where: { matchId } },
          assists: { where: { matchId } },
          ratings: { where: { matchId } }
        }
      })
    ]);

    if (!match || !player) {
      return NextResponse.json({ error: "Pelada ou jogador nao encontrado." }, { status: 404 });
    }
    if (player.userId !== user.id && !isPeladaAdmin(user)) {
      return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
    }

    const [poll, presenceCount] = await Promise.all([
      prisma.poll.findFirst({ where: { matchId, title: "Craque da pelada" }, include: { votes: true } }),
      prisma.attendance.count({ where: { playerId: player.id, status: "CONFIRMED" } })
    ]);

    const goals = player.goals.reduce((sum, item) => sum + item.quantity, 0);
    const assists = player.assists.reduce((sum, item) => sum + item.quantity, 0);
    const ratingsCount = player.ratings.length;
    const averageRating = ratingsCount ? player.ratings.reduce((sum, rating) => sum + rating.value, 0) / ratingsCount : null;

    const voteCounts = new Map<string, number>();
    for (const vote of poll?.votes ?? []) {
      voteCounts.set(vote.playerId, (voteCounts.get(vote.playerId) ?? 0) + 1);
    }
    const ranking = [...voteCounts.entries()].sort((a, b) => b[1] - a[1]);
    const rankIndex = ranking.findIndex(([candidateId]) => candidateId === player.id);
    const voteRank = rankIndex >= 0 ? rankIndex + 1 : null;
    const isCraqueWinner = poll?.status === "CLOSED" && poll.winnerId === player.id;

    const isGold = averageRating != null && averageRating >= 4;
    const isHumor = averageRating != null && averageRating < 2.5;
    const punchline = isGold
      ? "Hoje a pelada foi minha."
      : isHumor
        ? "Paguei a agua, ta pago."
        : "Nao fiz gol, mas nao faltei.";
    const ribbonLabel = isGold ? "Craque da pelada" : "Fechou a pelada";
    const showVoteRank = isGold && voteRank != null;
    const thirdStatValue = showVoteRank ? `${voteRank}º` : String(presenceCount);
    const thirdStatLabel = showVoteRank ? "na votacao" : "presenca";
    const badgeLabel = showVoteRank ? `${voteRank}º` : `${presenceCount}ª`;
    const filledStars = averageRating != null ? Math.min(5, Math.max(0, Math.round(averageRating))) : 0;
    const isGoalkeeper = player.position === "GOLEIRO";
    const dateLabel = formatShortDate(match.date);

    const theme = isGold
      ? {
          bg: "linear-gradient(170deg, #0B4A29 0%, #0a3f23 55%, #062a17 100%)",
          ribbonBg: "linear-gradient(90deg,#F4A11A,#ffc14d)",
          ribbonColor: "#16261D",
          photoRing: "linear-gradient(150deg,#F4A11A,#ffd98a)",
          photoBg: "#0a3f23",
          glow: "0 0 48px rgba(244,161,26,.55)",
          accent: "#F4A11A",
          sub: "#9fe3b8",
          badgeBg: "#F4A11A",
          badgeBorder: "#062a17"
        }
      : {
          bg: "linear-gradient(170deg, #11643A 0%, #0B4A29 55%, #072d19 100%)",
          ribbonBg: "rgba(255,255,255,.12)",
          ribbonColor: "#ffffff",
          photoRing: "linear-gradient(150deg,#1B9E4B,#9fe3b8)",
          photoBg: "#0a3f23",
          glow: "0 0 38px rgba(27,158,75,.4)",
          accent: "#9fe3b8",
          sub: "#9fe3b8",
          badgeBg: "#1B9E4B",
          badgeBorder: "#072d19"
        };

    const fonts = await getFonts();

    return new ImageResponse(
      (
        <div
          style={{
            width: "1080px",
            height: "1920px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            backgroundImage: theme.bg,
            color: "#ffffff",
            fontFamily: "Hanken Grotesk"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "315px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "800px",
              height: "800px",
              borderRadius: "50%",
              border: "4px solid rgba(255,255,255,0.07)"
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              padding: "144px 64px 0",
              alignItems: "center"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "19px",
                backgroundImage: theme.ribbonBg.startsWith("linear") ? theme.ribbonBg : undefined,
                backgroundColor: theme.ribbonBg.startsWith("linear") ? undefined : theme.ribbonBg,
                color: theme.ribbonColor,
                fontFamily: "Saira Condensed",
                fontWeight: 700,
                fontSize: "37px",
                letterSpacing: "5px",
                textTransform: "uppercase",
                padding: "21px 48px",
                borderRadius: "80px"
              }}
            >
              {isGold ? <SparkleIcon color={theme.ribbonColor} /> : <CheckIcon color={theme.sub} />}
              {ribbonLabel}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: "37px",
                position: "relative",
                width: "336px",
                height: "336px",
                borderRadius: "85px",
                padding: "11px",
                backgroundImage: theme.photoRing,
                boxShadow: theme.glow
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  borderRadius: "75px",
                  overflow: "hidden",
                  backgroundColor: isGoalkeeper ? "#DC8A1A" : theme.photoBg,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {player.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={player.photoUrl} width={336} height={336} style={{ objectFit: "cover" }} alt="" />
                ) : (
                  <span style={{ fontSize: "150px", fontWeight: 800, fontFamily: "Bricolage Grotesque" }}>
                    {player.nickname.trim().slice(0, 1).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "-21px",
                  right: "-21px",
                  width: "96px",
                  height: "96px",
                  borderRadius: "50%",
                  backgroundColor: theme.badgeBg,
                  border: `8px solid ${theme.badgeBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {isGold && isCraqueWinner ? (
                  <TrophyIcon color="#16261D" />
                ) : (
                  <span style={{ fontFamily: "Saira Condensed", fontWeight: 700, fontSize: "37px", color: "#16261D" }}>
                    {badgeLabel}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "32px" }}>
              <span style={{ fontFamily: "Bricolage Grotesque", fontWeight: 800, fontSize: "101px", letterSpacing: "-2px" }}>
                {player.nickname}
              </span>
              <span
                style={{
                  fontFamily: "Saira Condensed",
                  fontWeight: 600,
                  fontSize: "35px",
                  letterSpacing: "6px",
                  textTransform: "uppercase",
                  color: theme.sub,
                  marginTop: "19px"
                }}
              >
                {isGoalkeeper ? "Goleiro" : "Linha"} · {match.pelada.name}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: "37px",
                width: "100%",
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.13)",
                borderRadius: "59px",
                padding: "40px 48px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
                <span
                  style={{
                    fontFamily: "Saira Condensed",
                    fontWeight: 700,
                    fontSize: "123px",
                    color: isGold ? "#F4A11A" : "#ffffff",
                    lineHeight: 0.85
                  }}
                >
                  {averageRating != null ? averageRating.toFixed(1) : "-"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <span
                    style={{
                      fontFamily: "Saira Condensed",
                      fontWeight: 600,
                      fontSize: "29px",
                      letterSpacing: "4px",
                      textTransform: "uppercase",
                      color: theme.sub
                    }}
                  >
                    Nota da galera
                  </span>
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    {[0, 1, 2, 3, 4].map((index) => (
                      <StarIcon key={index} filled={index < filledStars} color={isGold ? "#F4A11A" : "#9fe3b8"} />
                    ))}
                  </div>
                  <span style={{ display: "flex", fontSize: "31px", color: "rgba(255,255,255,0.55)", marginTop: "13px" }}>
                    {ratingsCount} {ratingsCount === 1 ? "jogador avaliou" : "jogadores avaliaram"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", marginTop: "40px", paddingTop: "40px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <StatColumn value={String(goals)} label="Gols" />
                <div style={{ width: "1px", backgroundColor: "rgba(255,255,255,0.1)" }} />
                <StatColumn value={String(assists)} label="Assist." />
                <div style={{ width: "1px", backgroundColor: "rgba(255,255,255,0.1)" }} />
                <StatColumn value={thirdStatValue} label={thirdStatLabel} color={isGold ? "#F4A11A" : "#9fe3b8"} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: "27px" }}>
              <span style={{ fontFamily: "Bricolage Grotesque", fontWeight: 700, fontSize: "48px", lineHeight: 1.15 }}>
                &ldquo;{punchline}&rdquo;
              </span>
              <span style={{ display: "flex", fontSize: "32px", color: "rgba(255,255,255,0.5)", marginTop: "16px" }}>
                {match.title} · {dateLabel}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "auto",
                paddingTop: "37px",
                paddingBottom: "160px",
                width: "100%"
              }}
            >
              <div style={{ width: "100%", height: "1px", backgroundColor: "rgba(255,255,255,0.12)", marginBottom: "37px" }} />
              <span style={{ fontFamily: "Bricolage Grotesque", fontWeight: 700, fontSize: "43px" }}>Organize sua propria pelada</span>
              <span style={{ display: "flex", fontSize: "32px", color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>
                Baixe o app Dono da Pelada
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1920,
        fonts: [
          fonts.bricolage800 && ({ name: "Bricolage Grotesque", data: fonts.bricolage800, weight: 800, style: "normal" } as const),
          fonts.bricolage700 && ({ name: "Bricolage Grotesque", data: fonts.bricolage700, weight: 700, style: "normal" } as const),
          fonts.saira700 && ({ name: "Saira Condensed", data: fonts.saira700, weight: 700, style: "normal" } as const),
          fonts.saira600 && ({ name: "Saira Condensed", data: fonts.saira600, weight: 600, style: "normal" } as const),
          fonts.hanken500 && ({ name: "Hanken Grotesk", data: fonts.hanken500, weight: 500, style: "normal" } as const)
        ].filter((font): font is NonNullable<typeof font> => Boolean(font))
      }
    );
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Falha ao gerar story:", error);
    return NextResponse.json({ error: "Erro ao gerar imagem." }, { status: 500 });
  }
}
