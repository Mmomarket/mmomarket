import {
  forbiddenResponse,
  getCurrentUserId,
  isCurrentUserAdmin,
  unauthorizedResponse,
} from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/evidence?url=<blob-url>
 * Streams a private evidence video to the admin browser.
 * The BLOB_READ_WRITE_TOKEN is kept server-side; the raw blob URL
 * is never directly exposed to the client.
 * Admin-only.
 */
export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();
    if (!(await isCurrentUserAdmin())) return forbiddenResponse();

    const { searchParams } = new URL(req.url);
    const blobUrl = searchParams.get("url");

    if (!blobUrl) {
      return NextResponse.json(
        { error: "Parâmetro 'url' obrigatório" },
        { status: 400 },
      );
    }

    // Only allow URLs that belong to our Vercel Blob store
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(blobUrl);
    } catch {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    // Allow both public and private Vercel Blob store hostnames
    if (
      !parsedUrl.hostname.endsWith(".public.blob.vercel-storage.com") &&
      !parsedUrl.hostname.endsWith(".private.blob.vercel-storage.com")
    ) {
      return NextResponse.json(
        { error: "URL não pertence ao armazenamento autorizado" },
        { status: 400 },
      );
    }

    // Fetch the private blob from Vercel using the server-side token
    const upstream = await fetch(blobUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Vídeo não encontrado ou inacessível" },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "video/mp4";
    const contentLength = upstream.headers.get("content-length");

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      // Allow video seeking in the browser
      "Accept-Ranges": "bytes",
    };
    if (contentLength) headers["Content-Length"] = contentLength;

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("Evidence stream error:", error);
    return NextResponse.json(
      { error: "Erro ao acessar o vídeo." },
      { status: 500 },
    );
  }
}
