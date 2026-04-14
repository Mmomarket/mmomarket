import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      where: { active: true },
      include: {
        currencies: {
          where: { active: true },
        },
        servers: {
          where: { active: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(games);
  } catch (error) {
    console.error("Games API error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar jogos" },
      { status: 500 },
    );
  }
}
