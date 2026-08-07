const MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024;
const REMOTE_IMAGE_TIMEOUT_MS = 8_000;

function configuredStorageHost() {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isAllowedStoryImageUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;

    const allowedHosts = new Set([
      configuredStorageHost(),
      "lh3.googleusercontent.com",
      "platform-lookaside.fbsbx.com",
      "graph.facebook.com"
    ].filter((host): host is string => Boolean(host)));

    return allowedHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

async function readBodyWithLimit(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_REMOTE_IMAGE_BYTES) return null;
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REMOTE_IMAGE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}

export async function fetchStoryImageDataUrl(rawUrl: string | null) {
  if (!rawUrl || !isAllowedStoryImageUrl(rawUrl)) return null;

  try {
    const response = await fetch(rawUrl, {
      signal: AbortSignal.timeout(REMOTE_IMAGE_TIMEOUT_MS),
      redirect: "error",
      cache: "no-store"
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() || "";
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(contentType)) return null;

    const buffer = await readBodyWithLimit(response);
    if (!buffer?.length) return null;
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    // A missing or slow avatar must not prevent generation of the story. The
    // renderer will use the player's initial as its existing fallback.
    return null;
  }
}
