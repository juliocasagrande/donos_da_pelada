import path from "path";
import { Resvg } from "@resvg/resvg-js";
import { NextResponse } from "next/server";
import { ApiAuthError, isPeladaAdmin, requireApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const FONTS_DIR = path.join(process.cwd(), "src/assets/fonts");
const FONT_FILES = ["Inter-Regular.ttf", "Inter-SemiBold.ttf", "Inter-Bold.ttf", "Inter-ExtraBold.ttf"].map((file) =>
  path.join(FONTS_DIR, file)
);

function svgToPng(svg: string) {
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: "Inter"
    },
    fitTo: { mode: "zoom", value: 2 }
  });
  return resvg.render().asPng();
}

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
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.error(`Falha ao buscar foto do story (status ${response.status}): ${url}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      console.error(`Falha ao buscar foto do story (content-type "${contentType}"): ${url}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      console.error(`Falha ao buscar foto do story (arquivo vazio): ${url}`);
      return null;
    }
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error(`Falha ao buscar foto do story: ${url}`, error);
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
    <text x="${x}" y="1150" text-anchor="middle" font-family="Inter" font-size="75" font-weight="700" fill="${color}">${escapeXml(value)}</text>
    <text x="${x}" y="1208" text-anchor="middle" font-family="Inter" font-size="27" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,.55)">${escapeXml(label.toUpperCase())}</text>
  `;
}

function ballIcon(x: number, y: number, scale: number) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <circle cx="12" cy="12" r="10" fill="white" />
    <path d="M12 3 L14.5 6 L13 9.5 L11 9.5 L9.5 6 Z" fill="#16261D" />
    <path d="M19.5 10 L21 13.5 L18 15.5 L14.5 13.5 L14.5 10 L17 8.5 Z" fill="#16261D" />
    <path d="M4.5 10 L7 8.5 L9.5 10 L9.5 13.5 L6 15.5 L3 13.5 Z" fill="#16261D" />
    <path d="M15 19.5 L12 21 L9 19.5 L10 15 L11.5 13.5 L12.5 13.5 L14 15 Z" fill="#16261D" />
  </g>`;
}

function cleatIcon(x: number, y: number, scale: number) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M4 20 L4 7 Q4 5 7.5 5 L12 5 L12 14.5 L19.5 14.5 Q23 14.5 23 18 L23 20 Z" fill="white" />
    <ellipse cx="7.5" cy="21.2" rx="1.6" ry="0.75" fill="rgba(200,200,200,.88)" />
    <ellipse cx="12.8" cy="21.2" rx="1.6" ry="0.75" fill="rgba(200,200,200,.88)" />
    <ellipse cx="18.5" cy="21.2" rx="1.6" ry="0.75" fill="rgba(200,200,200,.88)" />
  </g>`;
}

type FriendlyResult = "VITORIA" | "EMPATE" | "DERROTA";

function friendlyResult(homeScore: number | null, awayScore: number | null): FriendlyResult {
  if (homeScore == null || awayScore == null || homeScore === awayScore) return "EMPATE";
  return homeScore > awayScore ? "VITORIA" : "DERROTA";
}

function friendlyTheme(result: FriendlyResult) {
  if (result === "VITORIA") {
    return {
      bgStart: "#0B4A29",
      bgMid: "#0a3f23",
      bgEnd: "#062a17",
      ringStart: "#F4A11A",
      ringEnd: "#ffd98a",
      ribbonFill: "url(#ribbonGold)",
      ribbonStroke: null,
      ribbonText: "#16261D",
      homeColor: "#fff",
      awayColor: "rgba(255,255,255,.35)",
      sub: "#9fe3b8",
      pillBg: "rgba(244,161,26,.18)",
      pillBorder: "rgba(244,161,26,.32)",
      pillText: "#F4A11A",
      pillLabel: "Vitoria!",
      watermark: true
    };
  }
  if (result === "DERROTA") {
    return {
      bgStart: "#062a17",
      bgMid: "#041a0e",
      bgEnd: "#020c07",
      ringStart: "rgba(255,255,255,.25)",
      ringEnd: "rgba(255,255,255,.1)",
      ribbonFill: "rgba(255,255,255,.08)",
      ribbonStroke: "rgba(255,255,255,.14)",
      ribbonText: "rgba(255,255,255,.7)",
      homeColor: "rgba(255,255,255,.35)",
      awayColor: "rgba(255,255,255,.85)",
      sub: "rgba(255,255,255,.5)",
      pillBg: "rgba(255,255,255,.07)",
      pillBorder: "rgba(255,255,255,.12)",
      pillText: "rgba(255,255,255,.5)",
      pillLabel: "Derrota",
      watermark: false
    };
  }
  return {
    bgStart: "#11643A",
    bgMid: "#0B4A29",
    bgEnd: "#072d19",
    ringStart: "#1B9E4B",
    ringEnd: "#9fe3b8",
    ribbonFill: "rgba(255,255,255,.12)",
    ribbonStroke: "rgba(255,255,255,.2)",
    ribbonText: "#ffffff",
    homeColor: "#fff",
    awayColor: "#fff",
    sub: "#9fe3b8",
    pillBg: "rgba(159,227,184,.14)",
    pillBorder: "rgba(159,227,184,.28)",
    pillText: "#9fe3b8",
    pillLabel: "Empate",
    watermark: false
  };
}

function renderAmistosoStorySvg({
  playerName,
  peladaName,
  opponentName,
  homeScore,
  awayScore,
  dateLabel,
  photoSrc,
  isGoalkeeper,
  goals,
  assists
}: {
  playerName: string;
  peladaName: string;
  opponentName: string;
  homeScore: number | null;
  awayScore: number | null;
  dateLabel: string;
  photoSrc: string | null;
  isGoalkeeper: boolean;
  goals: number;
  assists: number;
}) {
  const result = friendlyResult(homeScore, awayScore);
  const theme = friendlyTheme(result);
  const safeName = escapeXml(playerName);
  const initial = escapeXml(playerName.trim().slice(0, 1).toUpperCase() || "?");
  const homeLabel = homeScore != null ? String(homeScore) : "-";
  const awayLabel = awayScore != null ? String(awayScore) : "-";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920">
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
    <linearGradient id="ribbonGold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F4A11A" />
      <stop offset="100%" stop-color="#ffc14d" />
    </linearGradient>
    <pattern id="fieldLines" width="112" height="112" patternUnits="userSpaceOnUse">
      <rect width="3" height="112" fill="rgba(255,255,255,.04)" />
    </pattern>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(159,227,184,.18)" />
      <stop offset="64%" stop-color="rgba(159,227,184,0)" />
    </radialGradient>
    <clipPath id="photoClip">
      <rect x="152" y="752" width="160" height="160" rx="38" />
    </clipPath>
  </defs>

  <rect width="1080" height="1920" fill="url(#bg)" />
  <rect width="1080" height="1920" fill="url(#fieldLines)" />
  <circle cx="540" cy="500" r="380" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="4" />
  <circle cx="540" cy="460" r="520" fill="url(#glow)" />
  ${
    theme.watermark
      ? `<g transform="translate(900 60) scale(18)" opacity="0.07"><circle cx="12" cy="12" r="10" fill="#F4A11A"/><path d="M12 3 L14.5 6 L13 9.5 L11 9.5 L9.5 6 Z" fill="#062a17"/><path d="M19.5 10 L21 13.5 L18 15.5 L14.5 13.5 L14.5 10 L17 8.5 Z" fill="#062a17"/><path d="M4.5 10 L7 8.5 L9.5 10 L9.5 13.5 L6 15.5 L3 13.5 Z" fill="#062a17"/><path d="M15 19.5 L12 21 L9 19.5 L10 15 L11.5 13.5 L12.5 13.5 L14 15 Z" fill="#062a17"/></g>`
      : ""
  }

  <g>
    <rect x="290" y="181" width="500" height="80" rx="40" fill="${theme.ribbonFill}" ${theme.ribbonStroke ? `stroke="${theme.ribbonStroke}" stroke-width="3"` : ""} />
    ${ballIcon(330, 207, 1.2)}
    <text x="560" y="234" text-anchor="middle" font-family="Inter" font-size="36" font-weight="700" letter-spacing="5" fill="${theme.ribbonText}">AMISTOSO</text>

    <text x="540" y="372" text-anchor="middle" font-family="Inter" font-size="34" font-weight="700" letter-spacing="6" fill="${theme.sub}">${escapeXml(peladaName.toUpperCase())}</text>

    <text x="430" y="540" text-anchor="end" font-family="Inter" font-size="160" font-weight="800" fill="${theme.homeColor}" letter-spacing="-4">${escapeXml(homeLabel)}</text>
    <text x="540" y="520" text-anchor="middle" font-family="Inter" font-size="70" font-weight="600" fill="rgba(255,255,255,.28)">x</text>
    <text x="650" y="540" text-anchor="start" font-family="Inter" font-size="160" font-weight="800" fill="${theme.awayColor}" letter-spacing="-4">${escapeXml(awayLabel)}</text>

    <text x="540" y="600" text-anchor="middle" font-family="Inter" font-size="34" font-weight="700" letter-spacing="6" fill="rgba(255,255,255,.55)">${escapeXml(opponentName.toUpperCase())}</text>

    <g transform="translate(540 660)">
      <rect x="-130" y="-26" width="260" height="52" rx="26" fill="${theme.pillBg}" stroke="${theme.pillBorder}" stroke-width="2" />
      <circle cx="-95" cy="0" r="6" fill="${theme.pillText}" />
      <text x="-72" y="7" font-family="Inter" font-size="26" font-weight="700" letter-spacing="3" fill="${theme.pillText}">${escapeXml(theme.pillLabel.toUpperCase())}</text>
    </g>

    <line x1="64" y1="744" x2="1016" y2="744" stroke="rgba(255,255,255,.1)" stroke-width="3" />

    <rect x="144" y="744" width="176" height="176" rx="44" fill="url(#ring)" />
    <rect x="152" y="752" width="160" height="160" rx="38" fill="${isGoalkeeper ? "#DC8A1A" : "#0a3f23"}" />
    ${
      photoSrc
        ? `<image href="${photoSrc}" xlink:href="${photoSrc}" x="152" y="752" width="160" height="160" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)" />`
        : `<text x="232" y="864" text-anchor="middle" font-family="Inter" font-size="80" font-weight="800" fill="#fff">${initial}</text>`
    }
    <text x="356" y="812" font-family="Inter" font-size="56" font-weight="800" fill="#fff">${safeName}</text>
    <text x="356" y="858" font-family="Inter" font-size="26" font-weight="700" letter-spacing="4" fill="${theme.sub}">${escapeXml(`${isGoalkeeper ? "Goleiro" : "Linha"} · ${peladaName}`.toUpperCase())}</text>

    <rect x="64" y="960" width="952" height="360" rx="59" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.13)" stroke-width="3" />
    ${ballIcon(329, 1010, 1.8)}
    <text x="350" y="1130" text-anchor="middle" font-family="Inter" font-size="80" font-weight="700" fill="#fff">${goals}</text>
    <text x="350" y="1175" text-anchor="middle" font-family="Inter" font-size="27" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,.55)">GOLS</text>

    <line x1="540" y1="1000" x2="540" y2="1280" stroke="rgba(255,255,255,.1)" stroke-width="3" />

    ${cleatIcon(707, 1010, 1.8)}
    <text x="730" y="1130" text-anchor="middle" font-family="Inter" font-size="80" font-weight="700" fill="#fff">${assists}</text>
    <text x="730" y="1175" text-anchor="middle" font-family="Inter" font-size="27" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,.55)">ASSIST.</text>

    <text x="540" y="1420" text-anchor="middle" font-family="Inter" font-size="32" fill="rgba(255,255,255,.5)">${escapeXml(`${dateLabel} · Amistoso`)}</text>

    <line x1="64" y1="1642" x2="1016" y2="1642" stroke="rgba(255,255,255,.12)" stroke-width="3" />
    <text x="540" y="1708" text-anchor="middle" font-family="Inter" font-size="44" font-weight="800" fill="#fff">Organize sua própria pelada</text>
    <text x="540" y="1760" text-anchor="middle" font-family="Inter" font-size="32" fill="rgba(255,255,255,.5)">Baixe o app Donos da Pelada</text>
    <text x="540" y="1812" text-anchor="middle" font-family="Inter" font-size="28" fill="rgba(255,255,255,.4)">Acesse em donos-da-pelada.vercel.app</text>
  </g>
</svg>`;
}

function punchlineLines(value: string) {
  if (value === "Hoje a pelada foi minha.") return ["Hoje a pelada", "foi minha."];
  if (value === "Não fiz gol, mas não faltei.") return ["Não fiz gol,", "mas não faltei."];
  return ["Paguei a água,", "tá pago."];
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
        punchline: isHumor ? "Paguei a água, tá pago." : "Não fiz gol, mas não faltei."
      };

  const safeName = escapeXml(playerName);
  const initial = escapeXml(playerName.trim().slice(0, 1).toUpperCase() || "?");
  const ratingLabel = averageRating != null ? averageRating.toFixed(1) : "-";
  const ratingCopy = `${ratingsCount} ${ratingsCount === 1 ? "jogador avaliou" : "jogadores avaliaram"}`;
  const [punchlineTop, punchlineBottom] = punchlineLines(theme.punchline);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920">
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
      <rect x="383" y="317" width="314" height="314" rx="75" />
    </clipPath>
  </defs>

  <rect width="1080" height="1920" fill="url(#bg)" />
  <rect width="1080" height="1920" fill="url(#fieldLines)" />
  <line x1="0" y1="256" x2="1080" y2="256" stroke="rgba(255,255,255,.07)" stroke-width="4" />
  <circle cx="540" cy="714" r="400" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="4" />
  <circle cx="540" cy="626" r="${isGold ? 587 : 560}" fill="url(#glow)" />
  ${
    isGold
      ? `<polygon transform="translate(922 80) scale(20)" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="rgba(244,161,26,.06)" />`
      : ""
  }

  <g>
    <rect x="240" y="181" width="600" height="80" rx="40" fill="${theme.ribbonBg}" ${isGold ? "" : 'stroke="rgba(255,255,255,.18)" stroke-width="3"'} />
    ${
      isGold
        ? `<polygon transform="translate(269 202) scale(1.55)" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#16261D" />`
        : `<path d="m271 220 5 5 9-9" fill="none" stroke="#9fe3b8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />`
    }
    <text x="540" y="234" text-anchor="middle" font-family="Inter" font-size="36" font-weight="700" letter-spacing="5" fill="${theme.ribbonText}">${escapeXml(theme.ribbonLabel.toUpperCase())}</text>

    <rect x="372" y="306" width="336" height="336" rx="85" fill="url(#ring)" filter="url(#softShadow)" />
    <rect x="383" y="317" width="314" height="314" rx="75" fill="${isGoalkeeper ? "#DC8A1A" : "#0a3f23"}" />
    ${
      photoSrc
        ? `<image href="${photoSrc}" xlink:href="${photoSrc}" x="383" y="317" width="314" height="314" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)" />`
        : `<text x="540" y="522" text-anchor="middle" font-family="Inter" font-size="150" font-weight="800" fill="#fff">${initial}</text>`
    }
    <circle cx="682" cy="615" r="48" fill="${theme.badgeBg}" stroke="${theme.bgEnd}" stroke-width="8" />
    ${
      isGold
        ? `<path d="M663 607h-8a15 15 0 0 1 0-30h8m34 30h8a15 15 0 0 0 0-30h-8M652 648h56M674 627v10c0 5-4 8-8 10-8 4-13 10-13 21m53 0c0-11-5-17-13-21-4-2-8-5-8-10v-10M697 567h-34v40a17 17 0 0 0 34 0v-40Z" fill="none" stroke="#16261D" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />`
        : `<text x="682" y="629" text-anchor="middle" font-family="Inter" font-size="38" font-weight="700" fill="${theme.badgeColor}">${escapeXml(badgeLabel)}</text>`
    }

    <text x="540" y="776" text-anchor="middle" font-family="Inter" font-size="101" font-weight="800" fill="#fff">${safeName}</text>
    <text x="540" y="836" text-anchor="middle" font-family="Inter" font-size="35" font-weight="700" letter-spacing="6" fill="${theme.sub}">${escapeXml(`${isGoalkeeper ? "Goleiro" : "Linha"} · ${peladaName}`.toUpperCase())}</text>

    <rect x="64" y="870" width="952" height="400" rx="59" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.13)" stroke-width="3" />
    <text x="166" y="1002" font-family="Inter" font-size="123" font-weight="700" fill="${isGold ? "#F4A11A" : "#ffffff"}">${escapeXml(ratingLabel)}</text>
    <text x="402" y="948" font-family="Inter" font-size="29" font-weight="700" letter-spacing="4" fill="${theme.sub}">NOTA DA GALERA</text>
    <g transform="translate(402 976)">
      ${[0, 1, 2, 3, 4].map((index) => star(index, filledStars, isGold ? "#F4A11A" : "#9fe3b8")).join("")}
    </g>
    <text x="402" y="1052" font-family="Inter" font-size="31" fill="rgba(255,255,255,.55)">${escapeXml(ratingCopy)}</text>
    <line x1="112" y1="1076" x2="968" y2="1076" stroke="rgba(255,255,255,.1)" stroke-width="3" />
    ${statColumn(230, String(goals), "Gols")}
    <line x1="384" y1="1100" x2="384" y2="1230" stroke="rgba(255,255,255,.1)" stroke-width="3" />
    ${statColumn(540, String(assists), "Assist.")}
    <line x1="696" y1="1100" x2="696" y2="1230" stroke="rgba(255,255,255,.1)" stroke-width="3" />
    ${statColumn(850, thirdStatValue, thirdStatLabel, isGold ? "#F4A11A" : "#9fe3b8")}

    <text x="540" y="1362" text-anchor="middle" font-family="Inter" font-size="48" font-weight="800" fill="#fff">"${escapeXml(punchlineTop)}</text>
    <text x="540" y="1418" text-anchor="middle" font-family="Inter" font-size="48" font-weight="800" fill="#fff">${escapeXml(punchlineBottom)}"</text>
    <text x="540" y="1486" text-anchor="middle" font-family="Inter" font-size="32" fill="rgba(255,255,255,.5)">${escapeXml(`${matchTitle} · ${dateLabel}`)}</text>

    <line x1="64" y1="1642" x2="1016" y2="1642" stroke="rgba(255,255,255,.12)" stroke-width="3" />
    <text x="540" y="1708" text-anchor="middle" font-family="Inter" font-size="44" font-weight="800" fill="#fff">Organize sua própria pelada</text>
    <text x="540" y="1760" text-anchor="middle" font-family="Inter" font-size="32" fill="rgba(255,255,255,.5)">Baixe o app Donos da Pelada</text>
    <text x="540" y="1812" text-anchor="middle" font-family="Inter" font-size="28" fill="rgba(255,255,255,.4)">Acesse em donos-da-pelada.vercel.app</text>
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
          ratings: { where: { matchId } },
          user: { select: { image: true } }
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
    const topVoteCount = ranking[0]?.[1] ?? 0;
    const isCraqueDaPelada = topVoteCount > 0 && voteCounts.get(player.id) === topVoteCount;
    const isGold = isCraqueDaPelada || (averageRating != null && averageRating >= 8);
    const showVoteRank = isGold && voteRank != null;
    const photoSrc = await getImageDataUrl(player.photoUrl ?? player.user?.image ?? null);

    const svg =
      match.kind === "AMISTOSO"
        ? renderAmistosoStorySvg({
            playerName: player.nickname,
            peladaName: match.pelada.name,
            opponentName: match.opponentName || "Adversario",
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            dateLabel: formatShortDate(match.date),
            photoSrc,
            isGoalkeeper: player.position === "GOLEIRO",
            goals,
            assists
          })
        : renderStorySvg({
            playerName: player.nickname,
            peladaName: match.pelada.name,
            matchTitle: match.title,
            dateLabel: formatShortDate(match.date),
            photoSrc,
            isGoalkeeper: player.position === "GOLEIRO",
            isGold,
            isHumor: averageRating != null && averageRating < 5,
            averageRating,
            ratingsCount,
            filledStars: averageRating != null ? Math.min(5, Math.max(0, Math.round(averageRating / 2))) : 0,
            goals,
            assists,
            thirdStatValue: showVoteRank ? `${voteRank}o` : String(presenceCount),
            thirdStatLabel: showVoteRank ? "na votação" : "presença",
            badgeLabel: showVoteRank ? `${voteRank}o` : `${presenceCount}a`
          });

    const png = svgToPng(svg);

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
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
