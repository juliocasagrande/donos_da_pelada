import { describe, expect, it } from "vitest";
import { detectImageType } from "./imageUpload";

describe("detectImageType", () => {
  it("detects JPEG, PNG and WebP by their byte signatures", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))?.mimeType).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mimeType).toBe("image/png");
    expect(detectImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.mimeType).toBe("image/webp");
  });

  it("rejects arbitrary bytes even when a client could label them as an image", () => {
    expect(detectImageType(new TextEncoder().encode("not an image"))).toBeNull();
  });
});
