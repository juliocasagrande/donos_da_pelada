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
      addressdetails: "1"
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        "User-Agent": "DonoDaPelada/1.0 (app interno de organizacao de peladas)"
      }
    });

    if (!response.ok) {
      return NextResponse.json({ results: [] });
    }

    const data: Array<{
      display_name: string;
      address?: {
        road?: string;
        pedestrian?: string;
        footway?: string;
        cycleway?: string;
        neighbourhood?: string;
        suburb?: string;
        city_district?: string;
        borough?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
      };
    }> = await response.json();
    const results = [
      ...new Set(
        data
          .map((item) => {
            const address = item.address;
            if (!address) return item.display_name;

            const street = address.road || address.pedestrian || address.footway || address.cycleway;
            const district = address.suburb || address.neighbourhood || address.city_district || address.borough;
            const city = address.city || address.town || address.village || address.municipality;
            const formatted = [street, district, city].filter(Boolean).join(", ");

            return formatted || item.display_name;
          })
          .filter(Boolean)
      )
    ];

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Geocode failed:", error);
    return NextResponse.json({ results: [] });
  }
}
