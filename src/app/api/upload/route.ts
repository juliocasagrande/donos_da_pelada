import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStorageBucket, getStorageClient } from "@/lib/storage";
import { requireUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    await requireUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo nao enviado." }, { status: 400 });
    }

    const supabase = getStorageClient();
    const extension = file.name.split(".").pop() || "jpg";

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabase.storage.from(getStorageBucket()).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido no upload.";
    console.error("Upload failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
