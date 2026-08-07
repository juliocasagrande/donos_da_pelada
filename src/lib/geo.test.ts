import { describe, expect, it } from "vitest";
import { geographicBoundingBox, haversineKm } from "./geo";

describe("geo", () => {
  it("builds a bounding box that contains points inside the radius", () => {
    const box = geographicBoundingBox(-23.5505, -46.6333, 10);
    expect(box.minLatitude).toBeLessThan(-23.5505);
    expect(box.maxLatitude).toBeGreaterThan(-23.5505);
    expect(box.minLongitude).toBeLessThan(-46.6333);
    expect(box.maxLongitude).toBeGreaterThan(-46.6333);
  });

  it("keeps the exact haversine filter available after the coarse SQL filter", () => {
    expect(haversineKm(-23.5505, -46.6333, -23.5614, -46.6559)).toBeLessThan(3);
  });
});
