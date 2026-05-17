import {
  getCurrentUserId,
  isCurrentUserAdmin,
  unauthorizedResponse,
} from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  content: z.string().min(1).max(2000),
  evidenceUrl: z.string().url().optional(),
});

async function getTradeAndAuthorize(tradeId: string, userId: string) {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) return null;
  const admin = await isCurrentUserAdmin();
  if (trade.sellerId !== userId && trade.buyerId !== userId && !admin) {
    return null;
  }
  return trade;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;
    const trade = await getTradeAndAuthorize(id, userId);
    if (!trade) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const messages = await prisma.disputeMessage.findMany({
      where: { tradeId: id },
      include: {
        user: { select: { id: true, name: true, isAdmin: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar mensagens" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;
    const trade = await getTradeAndAuthorize(id, userId);
    if (!trade) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (
      trade.status === "PENDING_DELIVERY" ||
      trade.status === "DELIVERED" ||
      trade.status === "CONFIRMED" ||
      trade.status === "DISPUTED"
    ) {
      // Allow chat for all active and completed trades
    } else {
      return NextResponse.json(
        { error: "Chat não disponível para este trade" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { content, evidenceUrl } = postSchema.parse(body);

    const message = await prisma.disputeMessage.create({
      data: { tradeId: id, userId, content, evidenceUrl: evidenceUrl ?? null },
      include: {
        user: { select: { id: true, name: true, isAdmin: true } },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { error: "Erro ao enviar mensagem" },
      { status: 500 },
    );
  }
}
