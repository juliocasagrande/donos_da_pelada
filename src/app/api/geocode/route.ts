import { NextResponse } from "next/server";
import { ApiAuthError, requireApiUser } from "@/lib/session";
import { searchAddress } from "@/lib/geocode";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    const limit = await checkRateLimit(rateLimitKey("geocode", user.id), 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Muitas buscas. Aguarde um minuto e tente novamente." }, { status: 429 });
    }

    const query = new URL(request.url).searchParams.get("q")?.trim() || "";
    const results = await searchAddress(query);

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Geocode failed:", error);
    return NextResponse.json({ results: [] });
  }
}
