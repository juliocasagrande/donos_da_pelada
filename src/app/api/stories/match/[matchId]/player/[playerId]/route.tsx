import path from "path";
import { Resvg } from "@resvg/resvg-js";
import { NextResponse } from "next/server";
import { ApiAuthError, isPeladaAdmin, requireApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const FONTS_DIR = path.join(process.cwd(), "src/assets/fonts");
const FONT_FILES = [
  "Inter-Regular.ttf",
  "Inter-SemiBold.ttf",
  "Inter-Bold.ttf",
  "Inter-ExtraBold.ttf",
  "BricolageGrotesque-Bold.ttf",
  "BricolageGrotesque-ExtraBold.ttf",
  "HankenGrotesk-Medium.ttf",
  "HankenGrotesk-SemiBold.ttf",
  "HankenGrotesk-Bold.ttf",
  "SairaCondensed-SemiBold.ttf",
  "SairaCondensed-Bold.ttf"
].map((file) => path.join(FONTS_DIR, file));

const DS_COLORS = {
  campo: "#1B9E4B",
  mata: "#0B4A29",
  craque: "#F4A11A",
  craqueLight: "#fff2cf",
  tinta: "#16261D",
  musgo: "#69786D",
  linha: "#E6EADF",
  areia: "#F1F4ED",
  field950: "#04130a",
  field800: "#08351e",
  craqueTextDark: "#8a5a06",
  goalkeeper: "#DC8A1A"
};

function svgToPng(svg: string) {
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: "Hanken Grotesk"
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

function ratingStar(cx: number, cy: number, size: number, filled: boolean) {
  const scale = size / 24;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})"><path d="M12 2l2.9 6.6L22 9.3l-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-.7L12 2z" fill="${filled ? DS_COLORS.craque : DS_COLORS.linha}" /></g>`;
}

function textWidthApprox(text: string, fontSize: number, letterSpacingEm = 0) {
  const avgCharWidth = fontSize * 0.6;
  const letterSpacing = fontSize * letterSpacingEm;
  return text.length * (avgCharWidth + letterSpacing);
}

const CHECK_PATH = "M4 12l5 5L20 6";
const CROWN_PATH = "M2 7l4 3 6-8 6 8 4-3-2 11H4L2 7zm2 13h16v2H4v-2z";

type ResultTheme = {
  heroLinear: [string, string];
  heroRadial: { cx: string; cy: string; color: string; opacity: number; endPct: number };
  hairlineOpacity: number;
  circleOpacity1: number;
  circleOpacity2: number;
  pillBg: string;
  pillBorder: string;
  pillTextColor: string;
  pillIconColor: string;
  pillIcon: "check" | "crown";
  pillLabel: string;
  crownAbovePhoto: boolean;
  photoBorderStops: [string, string];
  badgeSize: number;
  badgeBg: string;
  badgeBorderColor: string;
  badgeTextColor: string;
  nameColor: string;
  roleColor: string;
  nameGap: number;
  statNumberColor: (index: 0 | 1 | 2) => string;
};

const NORMAL_RESULT_THEME: ResultTheme = {
  heroLinear: [DS_COLORS.field950, DS_COLORS.mata],
  heroRadial: { cx: "82%", cy: "0%", color: "244,161,26", opacity: 0.2, endPct: 46 },
  hairlineOpacity: 0.05,
  circleOpacity1: 0.1,
  circleOpacity2: 0.08,
  pillBg: "rgba(255,255,255,.10)",
  pillBorder: "rgba(255,255,255,.16)",
  pillTextColor: "#ffffff",
  pillIconColor: "#86efac",
  pillIcon: "check",
  pillLabel: "FECHOU A PELADA",
  crownAbovePhoto: false,
  photoBorderStops: [DS_COLORS.craque, DS_COLORS.craqueLight],
  badgeSize: 88,
  badgeBg: DS_COLORS.craque,
  badgeBorderColor: DS_COLORS.field950,
  badgeTextColor: DS_COLORS.tinta,
  nameColor: "#ffffff",
  roleColor: DS_COLORS.craque,
  nameGap: 36,
  statNumberColor: (i) => (i === 2 ? DS_COLORS.craqueTextDark : DS_COLORS.tinta)
};

const CRAQUE_RESULT_THEME: ResultTheme = {
  heroLinear: ["#5c3a08", DS_COLORS.craque],
  heroRadial: { cx: "50%", cy: "-10%", color: "255,235,180", opacity: 0.5, endPct: 55 },
  hairlineOpacity: 0.1,
  circleOpacity1: 0.18,
  circleOpacity2: 0.14,
  pillBg: "rgba(0,0,0,.16)",
  pillBorder: "rgba(255,255,255,.28)",
  pillTextColor: DS_COLORS.tinta,
  pillIconColor: DS_COLORS.tinta,
  pillIcon: "crown",
  pillLabel: "CRAQUE DA PELADA",
  crownAbovePhoto: true,
  photoBorderStops: ["#ffffff", DS_COLORS.craqueLight],
  badgeSize: 92,
  badgeBg: DS_COLORS.tinta,
  badgeBorderColor: DS_COLORS.craque,
  badgeTextColor: DS_COLORS.craque,
  nameColor: DS_COLORS.tinta,
  roleColor: DS_COLORS.tinta,
  nameGap: 48,
  statNumberColor: () => DS_COLORS.craqueTextDark
};

function ballIcon(x: number, y: number, scale: number) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <circle cx="12" cy="12" r="10" fill="white" />
    <path d="M12 3 L14.5 6 L13 9.5 L11 9.5 L9.5 6 Z" fill="#16261D" />
    <path d="M19.5 10 L21 13.5 L18 15.5 L14.5 13.5 L14.5 10 L17 8.5 Z" fill="#16261D" />
    <path d="M4.5 10 L7 8.5 L9.5 10 L9.5 13.5 L6 15.5 L3 13.5 Z" fill="#16261D" />
    <path d="M15 19.5 L12 21 L9 19.5 L10 15 L11.5 13.5 L12.5 13.5 L14 15 Z" fill="#16261D" />
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
      heroRadialColor: "244,161,26",
      heroRadialOpacity: 0.28,
      circleOpacity1: 0.1,
      circleOpacity2: 0.08,
      hairlineOpacity: 0.05,
      homeColor: "#fff",
      awayColor: "rgba(255,255,255,.35)",
      pillBg: "rgba(244,161,26,.16)",
      pillBorder: "rgba(244,161,26,.32)",
      pillText: DS_COLORS.craque,
      pillLabel: "Vitória",
      watermark: true
    };
  }
  if (result === "DERROTA") {
    return {
      heroRadialColor: "255,255,255",
      heroRadialOpacity: 0.06,
      circleOpacity1: 0.07,
      circleOpacity2: 0.05,
      hairlineOpacity: 0.04,
      homeColor: "rgba(255,255,255,.4)",
      awayColor: "rgba(255,255,255,.85)",
      pillBg: "rgba(255,255,255,.07)",
      pillBorder: "rgba(255,255,255,.14)",
      pillText: "rgba(255,255,255,.6)",
      pillLabel: "Derrota",
      watermark: false
    };
  }
  return {
    heroRadialColor: "159,227,184",
    heroRadialOpacity: 0.2,
    circleOpacity1: 0.1,
    circleOpacity2: 0.08,
    hairlineOpacity: 0.05,
    homeColor: "#fff",
    awayColor: "#fff",
    pillBg: "rgba(27,158,75,.16)",
    pillBorder: "rgba(27,158,75,.3)",
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
  const C = DS_COLORS;
  const result = friendlyResult(homeScore, awayScore);
  const theme = friendlyTheme(result);
  const safeName = escapeXml(playerName);
  const initial = escapeXml(playerName.trim().slice(0, 1).toUpperCase() || "?");
  const homeLabel = homeScore != null ? String(homeScore) : "-";
  const awayLabel = awayScore != null ? String(awayScore) : "-";
  const roleLine = `${isGoalkeeper ? "Goleiro" : "Linha"} · ${peladaName}`.toUpperCase();

  const heroHeight = 1000;
  const pillPadTop = 72;
  const pillPadX = 26;
  const pillPadY = 13;
  const pillIconSize = 22;
  const pillGap = 10;
  const pillLabelText = "AMISTOSO";
  const pillTextW = textWidthApprox(pillLabelText, 22, 0.14);
  const pillW = pillIconSize + pillGap + pillTextW + pillPadX * 2;
  const pillH = pillPadY * 2 + 26;
  const pillX = 540 - pillW / 2;
  const pillY = pillPadTop;

  const scoreTop = pillY + pillH + 40;
  const scoreFontSize = 140;
  const scoreBaselineY = scoreTop + scoreFontSize * 0.8;

  const opponentY = scoreBaselineY + 70;

  const resultPillW = 220;
  const resultPillH = 52;
  const resultPillY = opponentY + 28;
  const resultPillX = 540 - resultPillW / 2;

  const dividerY = resultPillY + resultPillH + 40;

  const photoSize = 176;
  const photoInnerSize = 160;
  const photoX = 144;
  const photoTop = dividerY + 40;
  const nameY = photoTop + 68;
  const roleY = photoTop + 114;

  const cardX = 64;
  const cardW = 1080 - 128;
  const cardY = 940;
  const cardH = 272;
  const cardRx = 22;

  const labelY = cardY + 44 + 18;
  const dividerCardY = labelY + 40;
  const statTop = dividerCardY + 34;
  const statNumberY = statTop + 62;
  const statLabelY = statNumberY + 30;
  const col1 = 540 - 180;
  const col2 = 540 + 180;
  const dividerColX = 540;

  const metaY = cardY + cardH + 60;

  const footerH = 320;
  const footerY = 1920 - 64 - footerH;
  const footerX = 64;
  const footerW = 1080 - 128;
  const crestOuter = { x: 540 - 38, y: footerY + 36, size: 76, rx: 20 };
  const crestInner = { x: crestOuter.x + 15, y: crestOuter.y + 15, size: 46, rx: 12 };
  const footerHeadlineY = crestOuter.y + crestOuter.size + 12 + 30;
  const footerSublineY = footerHeadlineY + 42;
  const pillCtaY = footerSublineY + 8 + 20;
  const pillCtaH = 56;
  const pillCtaText = "donosdapelada.com";
  const pillCtaW = 400;
  const pillCtaX = 540 - pillCtaW / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="heroBg" x1="0.25" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.field950}" />
      <stop offset="62%" stop-color="${C.mata}" />
      <stop offset="100%" stop-color="${C.mata}" />
    </linearGradient>
    <radialGradient id="heroGlow" cx="82%" cy="0%" r="55%">
      <stop offset="0%" stop-color="rgba(${theme.heroRadialColor},${theme.heroRadialOpacity})" />
      <stop offset="46%" stop-color="rgba(${theme.heroRadialColor},0)" />
    </radialGradient>
    <linearGradient id="photoRing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.craque}" />
      <stop offset="100%" stop-color="${C.craqueLight}" />
    </linearGradient>
    <linearGradient id="crestGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.mata}" />
      <stop offset="100%" stop-color="${C.campo}" />
    </linearGradient>
    <linearGradient id="footerBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.mata}" />
      <stop offset="100%" stop-color="${C.field800}" />
    </linearGradient>
    <pattern id="hairline" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
      <rect width="1" height="64" fill="rgba(255,255,255,${theme.hairlineOpacity})" />
    </pattern>
    <pattern id="hairlineFooter" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
      <rect width="1" height="64" fill="rgba(255,255,255,.05)" />
    </pattern>
    <clipPath id="photoClip">
      <rect x="${photoX + 8}" y="${photoTop + 8}" width="${photoInnerSize}" height="${photoInnerSize}" rx="38" />
    </clipPath>
    <clipPath id="footerClip">
      <rect x="${footerX}" y="${footerY}" width="${footerW}" height="${footerH}" rx="22" />
    </clipPath>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#11281c" flood-opacity=".18" />
    </filter>
    <filter id="footerShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#000000" flood-opacity=".35" />
    </filter>
  </defs>

  <rect width="1080" height="1920" fill="${C.areia}" />

  <rect width="1080" height="${heroHeight}" fill="url(#heroBg)" />
  <rect width="1080" height="${heroHeight}" fill="url(#heroGlow)" />
  <rect width="1080" height="${heroHeight}" fill="url(#hairline)" />
  <circle cx="1110" cy="90" r="230" fill="none" stroke="rgba(255,255,255,${theme.circleOpacity1})" stroke-width="2" />
  <circle cx="50" cy="660" r="140" fill="none" stroke="rgba(255,255,255,${theme.circleOpacity2})" stroke-width="2" />
  ${theme.watermark ? `<g transform="translate(870 40) scale(16)" opacity="0.08">${ballIcon(0, 0, 1)}</g>` : ""}

  <g>
    <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="11" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.16)" stroke-width="1" />
    ${ballIcon(pillX + pillPadX, pillY + pillH / 2 - pillIconSize / 2, pillIconSize / 24)}
    <text x="${pillX + pillPadX + pillIconSize + pillGap}" y="${pillY + pillH / 2 + 8}" font-family="Hanken Grotesk" font-size="22" font-weight="700" letter-spacing="3" fill="#ffffff">${pillLabelText}</text>

    <text x="430" y="${scoreBaselineY}" text-anchor="end" font-family="Bricolage Grotesque" font-size="${scoreFontSize}" font-weight="800" fill="${theme.homeColor}" letter-spacing="-2">${escapeXml(homeLabel)}</text>
    <text x="540" y="${scoreBaselineY - 20}" text-anchor="middle" font-family="Hanken Grotesk" font-size="60" font-weight="600" fill="rgba(255,255,255,.3)">x</text>
    <text x="650" y="${scoreBaselineY}" text-anchor="start" font-family="Bricolage Grotesque" font-size="${scoreFontSize}" font-weight="800" fill="${theme.awayColor}" letter-spacing="-2">${escapeXml(awayLabel)}</text>

    <text x="540" y="${opponentY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="28" font-weight="700" letter-spacing="4" fill="rgba(255,255,255,.6)">${escapeXml(opponentName.toUpperCase())}</text>

    <rect x="${resultPillX}" y="${resultPillY}" width="${resultPillW}" height="${resultPillH}" rx="11" fill="${theme.pillBg}" stroke="${theme.pillBorder}" stroke-width="1" />
    <text x="540" y="${resultPillY + resultPillH / 2 + 8}" text-anchor="middle" font-family="Hanken Grotesk" font-size="22" font-weight="700" letter-spacing="2.5" fill="${theme.pillText}">${escapeXml(theme.pillLabel.toUpperCase())}</text>

    <line x1="64" y1="${dividerY}" x2="1016" y2="${dividerY}" stroke="rgba(255,255,255,.1)" stroke-width="1" />

    <rect x="${photoX}" y="${photoTop}" width="${photoSize}" height="${photoSize}" rx="44" fill="url(#photoRing)" />
    <rect x="${photoX + 8}" y="${photoTop + 8}" width="${photoInnerSize}" height="${photoInnerSize}" rx="38" fill="${isGoalkeeper ? C.goalkeeper : "#0a3f23"}" />
    ${
      photoSrc
        ? `<image href="${photoSrc}" xlink:href="${photoSrc}" x="${photoX + 8}" y="${photoTop + 8}" width="${photoInnerSize}" height="${photoInnerSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)" />`
        : `<text x="${photoX + photoSize / 2}" y="${photoTop + photoSize / 2 + 24}" text-anchor="middle" font-family="Bricolage Grotesque" font-size="72" font-weight="800" fill="#fff">${initial}</text>`
    }

    <text x="356" y="${nameY}" font-family="Bricolage Grotesque" font-size="56" font-weight="800" fill="#fff">${safeName}</text>
    <text x="356" y="${roleY}" font-family="Hanken Grotesk" font-size="24" font-weight="700" letter-spacing="3.5" fill="${C.craque}">${escapeXml(roleLine)}</text>
  </g>

  <g filter="url(#cardShadow)">
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${cardRx}" fill="#ffffff" />
  </g>
  <g>
    <text x="540" y="${labelY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="23" font-weight="700" letter-spacing="3.2" fill="${C.musgo}">NESTA PARTIDA</text>
    <line x1="${cardX + 40}" y1="${dividerCardY}" x2="${cardX + cardW - 40}" y2="${dividerCardY}" stroke="${C.linha}" stroke-width="1" />

    <text x="${col1}" y="${statNumberY}" text-anchor="middle" font-family="Saira Condensed" font-size="70" font-weight="700" fill="${C.tinta}">${goals}</text>
    <text x="${col1}" y="${statLabelY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="18" font-weight="700" letter-spacing="1.8" fill="${C.musgo}">GOLS</text>

    <line x1="${dividerColX}" y1="${statTop}" x2="${dividerColX}" y2="${statLabelY}" stroke="${C.linha}" stroke-width="1" />

    <text x="${col2}" y="${statNumberY}" text-anchor="middle" font-family="Saira Condensed" font-size="70" font-weight="700" fill="${C.tinta}">${assists}</text>
    <text x="${col2}" y="${statLabelY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="18" font-weight="700" letter-spacing="1.8" fill="${C.musgo}">ASSIST.</text>
  </g>

  <text x="540" y="${metaY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="18" font-weight="600" fill="${C.musgo}">${escapeXml(`${dateLabel} · Amistoso`)}</text>

  <g filter="url(#footerShadow)">
    <rect x="${footerX}" y="${footerY}" width="${footerW}" height="${footerH}" rx="22" fill="url(#footerBg)" />
  </g>
  <g clip-path="url(#footerClip)">
    <rect x="${footerX}" y="${footerY}" width="${footerW}" height="${footerH}" fill="url(#hairlineFooter)" />
  </g>
  <g>
    <rect x="${crestOuter.x}" y="${crestOuter.y}" width="${crestOuter.size}" height="${crestOuter.size}" rx="${crestOuter.rx}" fill="#ffffff" />
    <rect x="${crestInner.x}" y="${crestInner.y}" width="${crestInner.size}" height="${crestInner.size}" rx="${crestInner.rx}" fill="url(#crestGrad)" />
    <path transform="translate(${crestInner.x + crestInner.size / 2 - 13} ${crestInner.y + crestInner.size / 2 - 13}) scale(1.1)" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

    <text x="540" y="${footerHeadlineY}" text-anchor="middle" font-family="Bricolage Grotesque" font-size="38" font-weight="800" fill="#fff">Organize sua própria pelada</text>
    <text x="540" y="${footerSublineY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="20" font-weight="600" fill="rgba(255,255,255,.82)">Baixe o app Donos da Pelada</text>

    <rect x="${pillCtaX}" y="${pillCtaY}" width="${pillCtaW}" height="${pillCtaH}" rx="14" fill="${C.craque}" />
    <text x="540" y="${pillCtaY + pillCtaH / 2 + 9}" text-anchor="middle" font-family="Hanken Grotesk" font-size="24" font-weight="700" fill="${C.tinta}">${pillCtaText}</text>
  </g>
</svg>`;
}

const CRAQUE_PUNCHLINE: [string, string] = ["Hoje a pelada", "foi minha."];

const PUNCHLINES_EXCELENTE: [string, string][] = [
  ["Hoje o campo", "era meu quintal."],
  ["Nível seleção,", "nem fadiga bateu."],
  ["Joguei fácil,", "sobrou classe."],
  ["Hoje o bicho", "pegou geral."],
  ["Categoria à parte,", "nem discuti."]
];

const PUNCHLINES_MUITO_BOM: [string, string][] = [
  ["Entreguei liga,", "sem neurose."],
  ["Rodei o campo", "com estilo."],
  ["Tabelinha fácil,", "nota alta."],
  ["Hoje rendeu,", "sem forçar."],
  ["Nível bom,", "reconhecido."]
];

const PUNCHLINES_BOM: [string, string][] = [
  ["Não fiz gol,", "mas não faltei."],
  ["Suei a camisa,", "cumpri tabela."],
  ["Corri geral,", "fiz o básico bem."],
  ["Sem luz,", "mas sem apagão."],
  ["Rodei liso,", "sem drama."]
];

const PUNCHLINES_MEDIANO: [string, string][] = [
  ["Deu pra jogar,", "sobrou fôlego."],
  ["Nem lembro,", "nem esqueço."],
  ["Cumpri tabela,", "sem brilho."],
  ["Joguei on,", "sem crase."],
  ["Rolou pelada,", "rolou nota."]
];

const PUNCHLINES_FRACO: [string, string][] = [
  ["Paguei a água,", "tá pago."],
  ["Hoje rodei,", "mas não no campo."],
  ["Nota baixa,", "orgulho intacto."],
  ["Joguei mal,", "mas sorri bastante."],
  ["Perna dura,", "coração mole."]
];

function pickRandom<T>(options: T[]) {
  return options[Math.floor(Math.random() * options.length)];
}

function ratingPunchlineLines(averageRating: number | null): [string, string] {
  if (averageRating == null) return PUNCHLINES_BOM[0];
  if (averageRating >= 9) return pickRandom(PUNCHLINES_EXCELENTE);
  if (averageRating >= 8) return pickRandom(PUNCHLINES_MUITO_BOM);
  if (averageRating >= 6) return pickRandom(PUNCHLINES_BOM);
  if (averageRating >= 5) return pickRandom(PUNCHLINES_MEDIANO);
  return pickRandom(PUNCHLINES_FRACO);
}

function renderStorySvg({
  playerName,
  peladaName,
  matchTitle,
  dateLabel,
  photoSrc,
  isGoalkeeper,
  isGold,
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
  averageRating: number | null;
  ratingsCount: number;
  filledStars: number;
  goals: number;
  assists: number;
  thirdStatValue: string;
  thirdStatLabel: string;
  badgeLabel: string;
}) {
  const C = DS_COLORS;
  const theme = isGold ? CRAQUE_RESULT_THEME : NORMAL_RESULT_THEME;
  const safeName = escapeXml(playerName);
  const initial = escapeXml(playerName.trim().slice(0, 1).toUpperCase() || "?");
  const ratingCopy = `${ratingsCount} ${ratingsCount === 1 ? "jogador avaliou" : "jogadores avaliaram"}`;
  const roleLine = isGold
    ? `${isGoalkeeper ? "Goleiro" : "Linha"} · Craque da rodada`.toUpperCase()
    : `${isGoalkeeper ? "Goleiro" : "Linha"} · ${peladaName}`.toUpperCase();
  const [punchlineTop, punchlineBottom] = isGold ? CRAQUE_PUNCHLINE : ratingPunchlineLines(averageRating);

  const heroHeight = 1000;
  const pillPadTop = 72;
  const pillPadX = 30;
  const pillPadY = 14;
  const pillIconSize = 20;
  const pillGap = 12;
  const pillTextW = textWidthApprox(theme.pillLabel, 22, 0.14);
  const pillW = pillIconSize + pillGap + pillTextW + pillPadX * 2;
  const pillH = pillPadY * 2 + 26;
  const pillX = 540 - pillW / 2;
  const pillY = pillPadTop;

  const photoSize = 420;
  const photoRx = 28;
  const photoInnerInset = 6;
  const photoInner = { size: photoSize - photoInnerInset * 2, rx: 24 };
  const photoTop = pillY + pillH + 44;
  const photoX = 540 - photoSize / 2;

  const badgeSize = theme.badgeSize;
  const badgeOffset = 16;
  const badgeCx = photoX + photoSize + badgeOffset - badgeSize / 2;
  const badgeCy = photoTop + photoSize + badgeOffset - badgeSize / 2;

  const nameY = photoTop + photoSize + theme.nameGap + 74;
  const roleY = nameY + 110 + 10 + 21;

  const cardX = 64;
  const cardW = 1080 - 128;
  const cardY = 940;
  const cardH = 374;
  const cardRx = 22;

  const labelY = cardY + 44 + 18;
  const starsY = labelY + 44;
  const captionY = starsY + 46;
  const dividerY = captionY + 34;
  const statTop = dividerY + 34;
  const statNumberY = statTop + 62;
  const statLabelY = statNumberY + 30;

  const colInnerPad = 40;
  const colsLeft = cardX + colInnerPad;
  const colsRight = cardX + cardW - colInnerPad;
  const colsWidth = colsRight - colsLeft;
  const col1 = colsLeft + colsWidth / 6;
  const col2 = colsLeft + colsWidth / 2;
  const col3 = colsLeft + (colsWidth * 5) / 6;
  const divider1X = colsLeft + colsWidth / 3;
  const divider2X = colsLeft + (colsWidth * 2) / 3;

  const quoteTopY = 1342;
  const quoteLine1Y = quoteTopY + 30 + 12 + 35;
  const quoteLine2Y = quoteLine1Y + 55;
  const quoteMetaY = quoteLine2Y + 45;

  const footerH = 320;
  const footerY = 1920 - 64 - footerH;
  const footerX = 64;
  const footerW = 1080 - 128;
  const crestOuter = { x: 540 - 38, y: footerY + 36, size: 76, rx: 20 };
  const crestInner = { x: crestOuter.x + 15, y: crestOuter.y + 15, size: 46, rx: 12 };
  const footerHeadlineY = crestOuter.y + crestOuter.size + 12 + 30;
  const footerSublineY = footerHeadlineY + 42;
  const pillCtaY = footerSublineY + 8 + 20;
  const pillCtaH = 56;
  const pillCtaText = "donosdapelada.com";
  const pillCtaW = 400;
  const pillCtaX = 540 - pillCtaW / 2;

  const pillIconSvg =
    theme.pillIcon === "check"
      ? `<path transform="translate(${pillX + pillPadX} ${pillY + pillH / 2 - pillIconSize / 2})" d="${CHECK_PATH}" fill="none" stroke="${theme.pillIconColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`
      : `<g transform="translate(${pillX + pillPadX} ${pillY + pillH / 2 - 11}) scale(0.92)"><path d="${CROWN_PATH}" fill="${theme.pillIconColor}" /></g>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="heroBg" x1="0.25" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.heroLinear[0]}" />
      <stop offset="62%" stop-color="${theme.heroLinear[1]}" />
      <stop offset="100%" stop-color="${theme.heroLinear[1]}" />
    </linearGradient>
    <radialGradient id="heroGlow" cx="${theme.heroRadial.cx}" cy="${theme.heroRadial.cy}" r="55%">
      <stop offset="0%" stop-color="rgba(${theme.heroRadial.color},${theme.heroRadial.opacity})" />
      <stop offset="${theme.heroRadial.endPct}%" stop-color="rgba(${theme.heroRadial.color},0)" />
    </radialGradient>
    <linearGradient id="photoRing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.photoBorderStops[0]}" />
      <stop offset="100%" stop-color="${theme.photoBorderStops[1]}" />
    </linearGradient>
    <linearGradient id="crestGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.mata}" />
      <stop offset="100%" stop-color="${C.campo}" />
    </linearGradient>
    <linearGradient id="footerBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${C.mata}" />
      <stop offset="100%" stop-color="${C.field800}" />
    </linearGradient>
    <pattern id="hairline" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
      <rect width="1" height="64" fill="rgba(255,255,255,${theme.hairlineOpacity})" />
    </pattern>
    <pattern id="hairlineFooter" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
      <rect width="1" height="64" fill="rgba(255,255,255,.05)" />
    </pattern>
    <clipPath id="photoClip">
      <rect x="${photoX + photoInnerInset}" y="${photoTop + photoInnerInset}" width="${photoInner.size}" height="${photoInner.size}" rx="${photoInner.rx}" />
    </clipPath>
    <clipPath id="footerClip">
      <rect x="${footerX}" y="${footerY}" width="${footerW}" height="${footerH}" rx="22" />
    </clipPath>
    <filter id="photoShadow" x="-40%" y="-20%" width="180%" height="180%">
      <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#000000" flood-opacity=".4" />
    </filter>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#11281c" flood-opacity=".18" />
    </filter>
    <filter id="footerShadow" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#000000" flood-opacity=".35" />
    </filter>
    <filter id="crownShadow" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000000" flood-opacity=".35" />
    </filter>
  </defs>

  <rect width="1080" height="1920" fill="${C.areia}" />

  <rect width="1080" height="${heroHeight}" fill="url(#heroBg)" />
  <rect width="1080" height="${heroHeight}" fill="url(#heroGlow)" />
  <rect width="1080" height="${heroHeight}" fill="url(#hairline)" />
  <circle cx="1110" cy="90" r="230" fill="none" stroke="rgba(255,255,255,${theme.circleOpacity1})" stroke-width="2" />
  <circle cx="50" cy="660" r="140" fill="none" stroke="rgba(255,255,255,${theme.circleOpacity2})" stroke-width="2" />

  <g>
    <rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="11" fill="${theme.pillBg}" stroke="${theme.pillBorder}" stroke-width="1" />
    ${pillIconSvg}
    <text x="${pillX + pillPadX + pillIconSize + pillGap}" y="${pillY + pillH / 2 + 8}" font-family="Hanken Grotesk" font-size="22" font-weight="700" letter-spacing="3" fill="${theme.pillTextColor}">${escapeXml(theme.pillLabel)}</text>

    ${
      theme.crownAbovePhoto
        ? `<g transform="translate(508 ${photoTop - 60}) scale(2.67)" filter="url(#crownShadow)"><path d="${CROWN_PATH}" fill="${C.craque}" /></g>`
        : ""
    }

    <rect x="${photoX}" y="${photoTop}" width="${photoSize}" height="${photoSize}" rx="${photoRx}" fill="url(#photoRing)" filter="url(#photoShadow)" />
    <rect x="${photoX + photoInnerInset}" y="${photoTop + photoInnerInset}" width="${photoInner.size}" height="${photoInner.size}" rx="${photoInner.rx}" fill="${isGoalkeeper ? C.goalkeeper : "#0a3f23"}" />
    ${
      photoSrc
        ? `<image href="${photoSrc}" xlink:href="${photoSrc}" x="${photoX + photoInnerInset}" y="${photoTop + photoInnerInset}" width="${photoInner.size}" height="${photoInner.size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)" />`
        : `<text x="540" y="${photoTop + photoSize / 2 + 55}" text-anchor="middle" font-family="Bricolage Grotesque" font-size="160" font-weight="800" fill="#fff">${initial}</text>`
    }
    <circle cx="${badgeCx}" cy="${badgeCy}" r="${badgeSize / 2}" fill="${theme.badgeBg}" stroke="${theme.badgeBorderColor}" stroke-width="5" />
    <text x="${badgeCx}" y="${badgeCy + 11}" text-anchor="middle" font-family="Saira Condensed" font-size="32" font-weight="700" fill="${theme.badgeTextColor}">${escapeXml(badgeLabel)}</text>

    <text x="540" y="${nameY}" text-anchor="middle" font-family="Bricolage Grotesque" font-size="92" font-weight="800" letter-spacing="-1" fill="${theme.nameColor}">${safeName}</text>
    <text x="540" y="${roleY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="26" font-weight="700" letter-spacing="4.2" fill="${theme.roleColor}">${escapeXml(roleLine)}</text>
  </g>

  <g filter="url(#cardShadow)">
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${cardRx}" fill="#ffffff" />
  </g>
  <g>
    <text x="540" y="${labelY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="23" font-weight="700" letter-spacing="3.2" fill="${C.musgo}">NOTA DA GALERA</text>
    <g>
      ${[0, 1, 2, 3, 4].map((i) => ratingStar(540 - 110 + i * 46, starsY, 38, i < filledStars)).join("")}
    </g>
    <text x="540" y="${captionY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="19" font-weight="500" fill="${C.musgo}">${escapeXml(ratingCopy)}</text>

    <line x1="${cardX + 40}" y1="${dividerY}" x2="${cardX + cardW - 40}" y2="${dividerY}" stroke="${C.linha}" stroke-width="1" />

    <text x="${col1}" y="${statNumberY}" text-anchor="middle" font-family="Saira Condensed" font-size="70" font-weight="700" fill="${theme.statNumberColor(0)}">${goals}</text>
    <text x="${col1}" y="${statLabelY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="18" font-weight="700" letter-spacing="1.8" fill="${C.musgo}">GOLS</text>

    <line x1="${divider1X}" y1="${statTop}" x2="${divider1X}" y2="${statLabelY}" stroke="${C.linha}" stroke-width="1" />

    <text x="${col2}" y="${statNumberY}" text-anchor="middle" font-family="Saira Condensed" font-size="70" font-weight="700" fill="${theme.statNumberColor(1)}">${assists}</text>
    <text x="${col2}" y="${statLabelY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="18" font-weight="700" letter-spacing="1.8" fill="${C.musgo}">ASSIST.</text>

    <line x1="${divider2X}" y1="${statTop}" x2="${divider2X}" y2="${statLabelY}" stroke="${C.linha}" stroke-width="1" />

    <text x="${col3}" y="${statNumberY}" text-anchor="middle" font-family="Saira Condensed" font-size="70" font-weight="700" fill="${theme.statNumberColor(2)}">${escapeXml(thirdStatValue)}</text>
    <text x="${col3}" y="${statLabelY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="18" font-weight="700" letter-spacing="1.8" fill="${C.musgo}">${escapeXml(thirdStatLabel.toUpperCase())}</text>
  </g>

  <g>
    <path transform="translate(500 ${quoteTopY})" d="M0 30V17.5C0 7.8 6.5 1 16 0v7.3C10.4 8.4 7.6 12 7.6 17.5H16V30H0zm22 0V17.5C22 7.8 28.5 1 38 0v7.3c-5.6 1.1-8.4 4.7-8.4 10.2H38V30H22z" fill="${C.craque}" opacity=".55" />
    <text x="540" y="${quoteLine1Y}" text-anchor="middle" font-family="Bricolage Grotesque" font-size="44" font-weight="700" fill="${C.tinta}">${escapeXml(punchlineTop)}</text>
    <text x="540" y="${quoteLine2Y}" text-anchor="middle" font-family="Bricolage Grotesque" font-size="44" font-weight="700" fill="${C.tinta}">${escapeXml(punchlineBottom)}</text>
    <text x="540" y="${quoteMetaY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="18" font-weight="600" fill="${C.musgo}">${escapeXml(`${matchTitle} · ${dateLabel}`)}</text>
  </g>

  <g filter="url(#footerShadow)">
    <rect x="${footerX}" y="${footerY}" width="${footerW}" height="${footerH}" rx="22" fill="url(#footerBg)" />
  </g>
  <g clip-path="url(#footerClip)">
    <rect x="${footerX}" y="${footerY}" width="${footerW}" height="${footerH}" fill="url(#hairlineFooter)" />
  </g>
  <g>
    <rect x="${crestOuter.x}" y="${crestOuter.y}" width="${crestOuter.size}" height="${crestOuter.size}" rx="${crestOuter.rx}" fill="#ffffff" />
    <rect x="${crestInner.x}" y="${crestInner.y}" width="${crestInner.size}" height="${crestInner.size}" rx="${crestInner.rx}" fill="url(#crestGrad)" />
    <path transform="translate(${crestInner.x + crestInner.size / 2 - 13} ${crestInner.y + crestInner.size / 2 - 13}) scale(1.1)" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

    <text x="540" y="${footerHeadlineY}" text-anchor="middle" font-family="Bricolage Grotesque" font-size="38" font-weight="800" fill="#fff">Organize sua própria pelada</text>
    <text x="540" y="${footerSublineY}" text-anchor="middle" font-family="Hanken Grotesk" font-size="20" font-weight="600" fill="rgba(255,255,255,.82)">Baixe o app Donos da Pelada</text>

    <rect x="${pillCtaX}" y="${pillCtaY}" width="${pillCtaW}" height="${pillCtaH}" rx="14" fill="${C.craque}" />
    <text x="540" y="${pillCtaY + pillCtaH / 2 + 9}" text-anchor="middle" font-family="Hanken Grotesk" font-size="24" font-weight="700" fill="${C.tinta}">${pillCtaText}</text>
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
    const isGold = isCraqueDaPelada;
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
