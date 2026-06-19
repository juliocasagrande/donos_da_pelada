import { NextResponse } from "next/server";
import { ApiAuthError, isPeladaAdmin, requireApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

async function getImageDataUrl(url: string | null) {
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function star(index: number, filledStars: number, color: string) {
  return `<polygon transform="translate(${index * 48} 0) scale(1.7)" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="${index < filledStars ? color : "rgba(255,255,255,.18)"}" />`;
}

function statColumn(x: number, value: string, label: string, color = "#fff") {
  return `
    <text x="${x}" y="1178" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="78" font-weight="700" fill="${color}">${escapeXml(value)}</text>
    <text x="${x}" y="1238" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="27" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,.55)">${escapeXml(label.toUpperCase())}</text>
  `;
}

function renderStorySvg({
  playerName,
  peladaName,
  matchTitle,
  dateLabel,
  photoSrc,
  isGoalkeeper,
  isGold,
  isHumor,
  isCraqueWinner,
  averageRating,
  ratingsCount,
  filledStars,
  goals,
  assists,
  thirdStatValue,
  thirdStatLabel,
  badgeLabel
}: {
  playerName: string;
  peladaName: string;
  matchTitle: string;
  dateLabel: string;
  photoSrc: string | null;
  isGoalkeeper: boolean;
  isGold: boolean;
  isHumor: boolean;
  isCraqueWinner: boolean;
  averageRating: number | null;
  ratingsCount: number;
  filledStars: number;
  goals: number;
  assists: number;
  thirdStatValue: string;
  thirdStatLabel: string;
  badgeLabel: string;
}) {
  const theme = isGold
    ? {
        bgStart: "#0B4A29",
        bgMid: "#0a3f23",
        bgEnd: "#062a17",
        ringStart: "#F4A11A",
        ringEnd: "#ffd98a",
        accent: "#F4A11A",
        sub: "#9fe3b8",
        badgeBg: "#F4A11A",
        badgeColor: "#16261D",
        ribbonBg: "#F4A11A",
        ribbonText: "#16261D",
        ribbonLabel: "Craque da pelada",
        punchline: "Hoje a pelada foi minha."
      }
    : {
        bgStart: "#11643A",
        bgMid: "#0B4A29",
        bgEnd: "#072d19",
        ringStart: "#1B9E4B",
        ringEnd: "#9fe3b8",
        accent: "#9fe3b8",
        sub: "#9fe3b8",
        badgeBg: "#1B9E4B",
        badgeColor: "#ffffff",
        ribbonBg: "rgba(255,255,255,.12)",
        ribbonText: "#ffffff",
        ribbonLabel: "Fechou a pelada",
        punchline: isHumor ? "Paguei a agua, ta pago." : "Nao fiz gol, mas nao faltei."
      };

  const safeName = escapeXml(playerName);
  const initial = escapeXml(playerName.trim().slice(0, 1).toUpperCase() || "?");
  const ratingLabel = averageRating != null ? averageRating.toFixed(1) : "-";
  const ratingCopy = `${ratingsCount} ${ratingsCount === 1 ? "jogador avaliou" : "jogadores avaliaram"}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bgStart}" />
      <stop offset="55%" stop-color="${theme.bgMid}" />
      <stop offset="100%" stop-color="${theme.bgEnd}" />
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.ringStart}" />
      <stop offset="100%" stop-color="${theme.ringEnd}" />
    </linearGradient>
    <pattern id="fieldLines" width="112" height="112" patternUnits="userSpaceOnUse">
      <rect width="3" height="112" fill="rgba(255,255,255,.04)" />
    </pattern>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(159,227,184,.20)" />
      <stop offset="64%" stop-color="rgba(159,227,184,0)" />
    </radialGradient>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity=".20" />
    </filter>
    <clipPath id="photoClip">
      <rect x="386" y="405" width="308" height="308" rx="76" />
    </clipPath>
  </defs>

  <rect width="1080" height="1920" fill="url(#bg)" />
  <rect width="1080" height="1920" fill="url(#fieldLines)" />
  <line x1="0" y1="256" x2="1080" y2="256" stroke="rgba(255,255,255,.07)" stroke-width="4" />
  <circle cx="540" cy="630" r="400" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="4" />
  <circle cx="540" cy="626" r="560" fill="url(#glow)" />

  <g transform="translate(0 112)">
    <rect x="336" y="48" width="408" height="86" rx="43" fill="${theme.ribbonBg}" stroke="rgba(255,255,255,.18)" />
    <circle cx="383" cy="91" r="9" fill="${theme.accent}" />
    <text x="540" y="103" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="36" font-weight="700" letter-spacing="5" fill="${theme.ribbonText}">${escapeXml(theme.ribbonLabel.toUpperCase())}</text>

    <rect x="374" y="393" width="332" height="332" rx="88" fill="url(#ring)" filter="url(#softShadow)" />
    <rect x="386" y="405" width="308" height="308" rx="76" fill="${isGoalkeeper ? "#DC8A1A" : "#0a3f23"}" />
    ${
      photoSrc
        ? `<image href="${photoSrc}" x="386" y="405" width="308" height="308" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)" />`
        : `<text x="540" y="610" text-anchor="middle" font-family="Arial, sans-serif" font-size="150" font-weight="800" fill="#fff">${initial}</text>`
    }
    <circle cx="682" cy="704" r="51" fill="${theme.badgeBg}" stroke="${theme.bgEnd}" stroke-width="8" />
    ${
      isGold && isCraqueWinner
        ? `<path d="M663 696h-8a15 15 0 0 1 0-30h8m34 30h8a15 15 0 0 0 0-30h-8M652 737h56M674 716v10c0 5-4 8-8 10-8 4-13 10-13 21m53 0c0-11-5-17-13-21-4-2-8-5-8-10v-10M697 656h-34v40a17 17 0 0 0 34 0v-40Z" fill="none" stroke="#16261D" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />`
        : `<text x="682" y="718" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="38" font-weight="700" fill="${theme.badgeColor}">${escapeXml(badgeLabel)}</text>`
    }

    <text x="540" y="823" text-anchor="middle" font-family="Arial, sans-serif" font-size="104" font-weight="800" fill="#fff">${safeName}</text>
    <text x="540" y="884" text-anchor="middle" font-family="Arial Narrow, Arial, sans-serif" font-size="36" font-weight="700" letter-spacing="6" fill="${theme.sub}">${escapeXml(`${isGoalkeeper ? "Goleiro" : "Linha"} - ${peladaName}`.toUpperCase())}</text>

    <rect x="64" y="940" width="952" height="352" rx="60" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.13)" />
    <text x="166" y="1072" font-family="Arial Narrow, Arial, sans-serif" font-size="124" font-weight="700" fill="${isGold ? "#F4A11A" : "#ffffff"}">${escapeXml(ratingLabel)}</text>
    <text x="402" y="1018" font-family="Arial Narrow, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="4" fill="${theme.sub}">NOTA DA GALERA</text>
    <g transform="translate(402 1046)">
      ${[0, 1, 2, 3, 4].map((index) => star(index, filledStars, isGold ? "#F4A11A" : "#9fe3b8")).join("")}
    </g>
    <text x="402" y="1122" font-family="Arial, sans-serif" font-size="31" fill="rgba(255,255,255,.55)">${escapeXml(ratingCopy)}</text>
    <line x1="112" y1="1146" x2="968" y2="1146" stroke="rgba(255,255,255,.1)" stroke-width="3" />
    ${statColumn(230, String(goals), "Gols")}
    <line x1="384" y1="1168" x2="384" y2="1260" stroke="rgba(255,255,255,.1)" stroke-width="3" />
    ${statColumn(540, String(assists), "Assist.")}
    <line x1="696" y1="1168" x2="696" y2="1260" stroke="rgba(255,255,255,.1)" stroke-width="3" />
    ${statColumn(850, thirdStatValue, thirdStatLabel, isGold ? "#F4A11A" : "#9fe3b8")}

    <text x="540" y="1402" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="800" fill="#fff">"${escapeXml(theme.punchline)}"</text>
    <text x="540" y="1466" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="rgba(255,255,255,.5)">${escapeXml(`${matchTitle} - ${dateLabel}`)}</text>

    <line x1="64" y1="1642" x2="1016" y2="1642" stroke="rgba(255,255,255,.12)" stroke-width="3" />
    <text x="540" y="1708" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="800" fill="#fff">Organize sua propria pelada</text>
    <text x="540" y="1760" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="rgba(255,255,255,.5)">Baixe o app Dono da Pelada</text>
  </g>
</svg>`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ matchId: string; playerId: string }> }) {
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
    const isGold = averageRating != null && averageRating >= 8;
    const showVoteRank = isGold && voteRank != null;

    const svg = renderStorySvg({
      playerName: player.nickname,
      peladaName: match.pelada.name,
      matchTitle: match.title,
      dateLabel: formatShortDate(match.date),
      photoSrc: await getImageDataUrl(player.photoUrl),
      isGoalkeeper: player.position === "GOLEIRO",
      isGold,
      isHumor: averageRating != null && averageRating < 5,
      isCraqueWinner: poll?.status === "CLOSED" && poll.winnerId === player.id,
      averageRating,
      ratingsCount,
      filledStars: averageRating != null ? Math.min(5, Math.max(0, Math.round(averageRating / 2))) : 0,
      goals,
      assists,
      thirdStatValue: showVoteRank ? `${voteRank}o` : String(presenceCount),
      thirdStatLabel: showVoteRank ? "na votacao" : "presenca",
      badgeLabel: showVoteRank ? `${voteRank}o` : `${presenceCount}a`
    });

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Falha ao gerar story:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar imagem.",
        detail: process.env.NODE_ENV === "production" ? undefined : error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
