import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
  "video/x-matroska", // .mkv
  "video/avi",
  "video/x-msvideo",
];

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Apenas arquivos de vídeo são aceitos como prova (MP4, WebM, MOV, MKV, AVI).",
        },
        { status: 415 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "O arquivo excede o limite de 500 MB." },
        { status: 413 },
      );
    }

    const ext = file.name.split(".").pop() ?? "mp4";
    const filename = `evidence/${userId}/${Date.now()}.${ext}`;

    const blob = await put(filename, file, {
      access: "private",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Evidence upload error:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload do vídeo." },
      { status: 500 },
    );
  }
}
