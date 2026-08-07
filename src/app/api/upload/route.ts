import { randomUUID } from "crypto";
import { after } from "next/server";
import { NextResponse } from "next/server";
import { detectImageType } from "@/lib/imageUpload";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";
import { ApiAuthError, requireApiUser } from "@/lib/session";
import {
  cleanupStaleUploadedAssets,
  deleteUploadedAssetIfUnreferenced,
  getStorageBucket,
  getStorageClient
} from "@/lib/storage";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const [minuteLimit, dailyLimit] = await Promise.all([
      checkRateLimit(rateLimitKey("upload-minute", user.id), 10, 60_000),
      checkRateLimit(rateLimitKey("upload-day", user.id), 50, 24 * 60 * 60 * 1000)
    ]);
    if (!minuteLimit.allowed || !dailyLimit.allowed) {
      return NextResponse.json({ error: "Limite de uploads atingido. Tente novamente mais tarde." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const temporaryUrl = typeof formData.get("temporaryUrl") === "string" ? String(formData.get("temporaryUrl")) : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo nao enviado." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande. Limite de 8MB." }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectImageType(bytes);
    if (!detected || file.type !== detected.mimeType) {
      return NextResponse.json(
        { error: "Conteudo invalido. Envie uma imagem JPEG, PNG ou WebP valida." },
        { status: 400 }
      );
    }

    const supabase = getStorageClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para enviar fotos." },
        { status: 500 }
      );
    }

    const bucket = getStorageBucket();
    const path = `${user.id}/${randomUUID()}.${detected.extension}`;
    const uploadFile = new Blob([bytes], { type: detected.mimeType });
    const { error } = await supabase.storage.from(bucket).upload(path, uploadFile, {
      contentType: detected.mimeType,
      cacheControl: "31536000",
      upsert: false
    });
    if (error) {
      console.error("Supabase upload failed:", error.message);
      return NextResponse.json({ error: "Nao foi possivel enviar a foto. Tente novamente." }, { status: 500 });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    try {
      await prisma.uploadedAsset.create({
        data: { userId: user.id, bucket, path, publicUrl: data.publicUrl }
      });
    } catch (error) {
      await supabase.storage.from(bucket).remove([path]);
      throw error;
    }

    after(async () => {
      await Promise.all([
        deleteUploadedAssetIfUnreferenced(temporaryUrl),
        cleanupStaleUploadedAssets()
      ]);
    });
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Erro desconhecido no upload.";
    console.error("Upload failed:", message);
    return NextResponse.json({ error: "Nao foi possivel enviar a foto. Tente novamente." }, { status: 500 });
  }
}
