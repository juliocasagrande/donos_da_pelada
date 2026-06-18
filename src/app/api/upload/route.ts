import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStorageBucket, getStorageClient } from "@/lib/storage";
import { ApiAuthError, requireApiUser } from "@/lib/session";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireApiUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo nao enviado." }, { status: 400 });
    }

    const extension = ALLOWED_MIME_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: "Formato invalido. Envie uma imagem JPEG, PNG ou WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Arquivo muito grande. Limite de 8MB." }, { status: 413 });
    }

    const supabase = getStorageClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para enviar fotos." },
        { status: 500 }
      );
    }

    const path = `${randomUUID()}.${extension}`;
    const bytes = await file.arrayBuffer();
    const uploadFile = new Blob([bytes], { type: file.type || "image/jpeg" });

    const { error } = await supabase.storage
      .from(getStorageBucket())
      .upload(path, uploadFile, {
        contentType: file.type || "image/jpeg",
        upsert: false
      });

    if (error) {
      console.error("Supabase upload failed:", error.message);
      return NextResponse.json({ error: "Nao foi possivel enviar a foto. Tente novamente." }, { status: 500 });
    }

    const { data } = supabase.storage.from(getStorageBucket()).getPublicUrl(path);
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
