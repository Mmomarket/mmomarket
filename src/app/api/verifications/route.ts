import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const verificationSchema = z.object({
  gameSlug: z.string().min(1),
  serverId: z.string().min(1, "Servidor é obrigatório"),
  server: z.string().optional(),
  characterName: z.string().min(1, "Nome do personagem é obrigatório"),
  screenshotUrl: z.string().min(1, "Screenshot é obrigatório"),
  amount: z.number().positive("Quantidade deve ser positiva"),
});

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const verifications = await prisma.verification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(verifications);
  } catch (error) {
    console.error("Verifications GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar verificações" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const body = await req.json();
    const data = verificationSchema.parse(body);

    // Reject if user already has a PENDING or APPROVED verification for this server
    const existing = await prisma.verification.findFirst({
      where: {
        userId,
        serverId: data.serverId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });
    if (existing) {
      const msg =
        existing.status === "APPROVED"
          ? "Você já possui uma verificação aprovada para este servidor."
          : "Você já tem uma verificação pendente para este servidor. Aguarde a revisão.";
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    const verification = await prisma.verification.create({
      data: {
        userId,
        gameSlug: data.gameSlug,
        serverId: data.serverId,
        server: data.server,
        characterName: data.characterName,
        screenshotUrl: data.screenshotUrl,
        amount: data.amount,
        status: "PENDING",
      },
    });

    return NextResponse.json(verification, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Verifications POST error:", error);
    return NextResponse.json(
      { error: "Erro ao criar verificação" },
      { status: 500 },
    );
  }
}
