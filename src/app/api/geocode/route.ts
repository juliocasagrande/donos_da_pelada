import { NextResponse } from "next/server";
import { ApiAuthError, requireApiAdmin } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await requireApiAdmin();

    const query = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (query.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const params = new URLSearchParams({
      format: "json",
      q: query,
      limit: "5",
      countrycodes: "br",
      addressdetails: "0"
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        "User-Agent": "DonoDaPelada/1.0 (app interno de organizacao de peladas)"
      }
    });

    if (!response.ok) {
      return NextResponse.json({ results: [] });
    }

    const data: Array<{ display_name: string }> = await response.json();
    const results = data.map((item) => item.display_name);

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Geocode failed:", error);
    return NextResponse.json({ results: [] });
  }
}
