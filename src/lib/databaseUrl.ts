const DEFAULT_CONNECTION_LIMIT = 3;

function parseConnectionLimit(rawLimit?: string | null) {
  if (!rawLimit?.trim()) return undefined;
  const value = Number(rawLimit);
  return Number.isInteger(value) && value >= 1 ? value : undefined;
}

export function normalizeRuntimeDatabaseUrl(
  rawUrl?: string,
  rawConnectionLimit = process.env.PRISMA_CONNECTION_LIMIT
) {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.includes("-pooler")) return rawUrl;

    const overrideLimit = parseConnectionLimit(rawConnectionLimit);
    const configuredLimit = parseConnectionLimit(url.searchParams.get("connection_limit"));
    const connectionLimit = overrideLimit ?? Math.max(configuredLimit ?? 0, DEFAULT_CONNECTION_LIMIT);

    url.searchParams.set("connection_limit", String(connectionLimit));
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "15");
    return url.toString();
  } catch {
    return rawUrl;
  }
}
