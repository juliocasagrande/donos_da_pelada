export type DetectedImage = { mimeType: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" };

function matches(bytes: Uint8Array, offset: number, signature: number[]) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function detectImageType(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length >= 3 && matches(bytes, 0, [0xff, 0xd8, 0xff])) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && matches(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (
    bytes.length >= 12 &&
    matches(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    matches(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}
