import { NextResponse } from "next/server";
import { ApiAuthError, requireApiUser } from "@/lib/session";
import { searchAddress } from "@/lib/geocode";

export async function GET(request: Request) {
  try {
    await requireApiUser();

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
