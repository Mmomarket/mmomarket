import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Use PNG, JPG ou WebP." },
        { status: 400 },
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 5MB." },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() || "png";

    const filename = `${uuidv4()}.${ext}`;

    // Use /tmp/uploads on Vercel/serverless, public/uploads locally
    const isServerless =
      !!process.env.VERCEL || process.env.NODE_ENV === "production";
    const uploadDir = isServerless
      ? "/tmp/uploads"
      : join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Return a URL that works for your app
    const url = isServerless
      ? `/api/upload/tmp/${filename}`
      : `/uploads/${filename}`;

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload" },
      { status: 500 },
    );
  }
}
