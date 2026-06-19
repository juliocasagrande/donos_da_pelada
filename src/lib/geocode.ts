export type GeocodeResult = {
  label: string;
  lat: number;
  lon: number;
};

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    format: "json",
    q: trimmed,
    limit: "5",
    countrycodes: "br",
    addressdetails: "1"
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      "User-Agent": "DonoDaPelada/1.0 (app interno de organizacao de peladas)"
    }
  });

  if (!response.ok) return [];

  const data: Array<{
    display_name: string;
    lat: string;
    lon: string;
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

  const seen = new Set<string>();
  const results: GeocodeResult[] = [];

  for (const item of data) {
    const address = item.address;
    const street = address?.road || address?.pedestrian || address?.footway || address?.cycleway;
    const district = address?.suburb || address?.neighbourhood || address?.city_district || address?.borough;
    const city = address?.city || address?.town || address?.village || address?.municipality;
    const label = [street, district, city].filter(Boolean).join(", ") || item.display_name;

    if (seen.has(label)) continue;
    seen.add(label);

    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;

    results.push({ label, lat, lon });
  }

  return results;
}
