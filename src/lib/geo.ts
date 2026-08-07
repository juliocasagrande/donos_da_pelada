const EARTH_RADIUS_KM = 6371;

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const a =
    sinDLat * sinDLat + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function geographicBoundingBox(latitude: number, longitude: number, radiusKm: number) {
  const safeRadius = Math.max(0, radiusKm);
  const latitudeDelta = safeRadius / 111.32;
  const longitudeScale = Math.max(0.01, Math.cos(toRad(latitude)));
  const longitudeDelta = safeRadius / (111.32 * longitudeScale);

  return {
    minLatitude: Math.max(-90, latitude - latitudeDelta),
    maxLatitude: Math.min(90, latitude + latitudeDelta),
    minLongitude: Math.max(-180, longitude - longitudeDelta),
    maxLongitude: Math.min(180, longitude + longitudeDelta)
  };
}
