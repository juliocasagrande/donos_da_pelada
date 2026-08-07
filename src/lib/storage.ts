import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
}

export function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "player-photos";
}

export async function markUploadedAssetAttached(publicUrl?: string | null) {
  if (!publicUrl) return;
  await prisma.uploadedAsset.updateMany({
    where: { publicUrl, attachedAt: null },
    data: { attachedAt: new Date() }
  });
}

export async function deleteUploadedAssetIfUnreferenced(publicUrl?: string | null) {
  if (!publicUrl) return;
  const asset = await prisma.uploadedAsset.findUnique({ where: { publicUrl } });
  if (!asset) return;

  const [userReferences, playerReferences] = await Promise.all([
    prisma.user.count({ where: { image: publicUrl } }),
    prisma.player.count({ where: { photoUrl: publicUrl } })
  ]);
  if (userReferences + playerReferences > 0) return;

  const storage = getStorageClient();
  if (!storage) return;
  const { error } = await storage.storage.from(asset.bucket).remove([asset.path]);
  if (error) {
    console.error("Falha ao remover imagem substituida:", error.message);
    return;
  }
  await prisma.uploadedAsset.deleteMany({ where: { id: asset.id } });
}

export async function cleanupStaleUploadedAssets() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await prisma.uploadedAsset.findMany({
    where: { attachedAt: null, createdAt: { lt: cutoff } },
    select: { id: true, bucket: true, path: true },
    orderBy: { createdAt: "asc" },
    take: 50
  });
  if (!stale.length) return;

  const storage = getStorageClient();
  if (!storage) return;
  for (const bucket of new Set(stale.map((asset) => asset.bucket))) {
    const assets = stale.filter((asset) => asset.bucket === bucket);
    const { error } = await storage.storage.from(bucket).remove(assets.map((asset) => asset.path));
    if (!error) {
      await prisma.uploadedAsset.deleteMany({ where: { id: { in: assets.map((asset) => asset.id) } } });
    }
  }
}
