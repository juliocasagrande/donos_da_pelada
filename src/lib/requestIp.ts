type HeaderRecord = Record<string, string | string[] | undefined>;

function headerValue(headers: Headers | HeaderRecord | undefined, name: string) {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

export function getClientIp(headers: Headers | HeaderRecord | undefined) {
  const forwarded = headerValue(headers, "x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = headerValue(headers, "x-real-ip")?.trim() || forwarded || "unknown";
  return /^[0-9a-f:.]{1,64}$/i.test(candidate) ? candidate.toLowerCase() : "unknown";
}
