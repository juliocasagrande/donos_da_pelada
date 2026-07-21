import { prisma } from "@/lib/prisma";

export type MatchDefaults = {
  title: string;
  date: string;
  time: string;
  surface: string;
  kind: string;
  location: string | null;
};

function saoPauloParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

/**
 * Suggests the next occurrence of the same weekday/time as the last match,
 * so recurring peladas (same day every week) don't need re-entering the date.
 */
function suggestNextOccurrence(lastDate: Date) {
  const last = saoPauloParts(lastDate);
  const now = saoPauloParts(new Date());
  const lastWeekday = new Date(Date.UTC(last.year, last.month - 1, last.day)).getUTCDay();
  const today = new Date(Date.UTC(now.year, now.month - 1, now.day));
  const diff = (lastWeekday - today.getUTCDay() + 7) % 7;
  today.setUTCDate(today.getUTCDate() + diff);
  return {
    date: today.toISOString().slice(0, 10),
    time: `${String(last.hour).padStart(2, "0")}:${String(last.minute).padStart(2, "0")}`
  };
}

export async function getMatchDefaults(peladaId: string): Promise<MatchDefaults | null> {
  const last = await prisma.match.findFirst({
    where: { peladaId, deletedAt: null },
    orderBy: { date: "desc" },
    select: { title: true, date: true, surface: true, kind: true, location: true }
  });
  if (!last) return null;

  const { date, time } = suggestNextOccurrence(last.date);
  return { title: last.title, date, time, surface: last.surface, kind: last.kind, location: last.location };
}

export async function getRecentLocations(peladaId: string) {
  const recentMatches = await prisma.match.findMany({
    where: { peladaId, deletedAt: null, location: { not: null } },
    select: { location: true },
    orderBy: { date: "desc" },
    take: 12
  });
  return [...new Set(recentMatches.map((match) => match.location).filter((location): location is string => Boolean(location)))].slice(0, 3);
}
