import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/perfil/[id] - Public profile data
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        verifications: {
          select: { status: true },
          where: { status: "APPROVED" },
          take: 1,
        },
        sellTrades: {
          where: { status: "CONFIRMED" },
          select: { id: true },
        },
        buyTrades: {
          where: { status: "CONFIRMED" },
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    const completedSales = user.sellTrades.length;
    const completedPurchases = user.buyTrades.length;
    const isVerified = user.verifications.length > 0;

    return NextResponse.json({
      id: user.id,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt,
      isVerified,
      completedSales,
      completedPurchases,
      totalTrades: completedSales + completedPurchases,
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar perfil" },
      { status: 500 },
    );
  }
}
