import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStoryImageDataUrl, isAllowedStoryImageUrl } from "./remoteImage";

describe("story image URL allowlist", () => {
  afterEach(() => {
    delete process.env.SUPABASE_URL;
    vi.unstubAllGlobals();
  });

  it("allows the configured Supabase host and supported OAuth image hosts", () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    expect(isAllowedStoryImageUrl("https://project.supabase.co/storage/v1/object/public/photos/a.webp")).toBe(true);
    expect(isAllowedStoryImageUrl("https://lh3.googleusercontent.com/avatar.png")).toBe(true);
  });

  it("rejects internal, insecure, credentialed and redirected-host candidates", () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    expect(isAllowedStoryImageUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedStoryImageUrl("https://localhost/image.png")).toBe(false);
    expect(isAllowedStoryImageUrl("https://user:pass@project.supabase.co/image.png")).toBe(false);
    expect(isAllowedStoryImageUrl("https://project.supabase.co.evil.example/image.png")).toBe(false);
  });

  it("falls back cleanly when an allowed avatar cannot be downloaded", async () => {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(fetchStoryImageDataUrl("https://project.supabase.co/avatar.png")).resolves.toBeNull();
  });
});
