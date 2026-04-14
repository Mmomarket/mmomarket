import {
  forbiddenResponse,
  getCurrentUserId,
  isCurrentUserAdmin,
  unauthorizedResponse,
} from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/admin/verifications - List all verifications (admin only)
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();
    if (!(await isCurrentUserAdmin())) return forbiddenResponse();

    const verifications = await prisma.verification.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        serverRef: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(verifications);
  } catch (error) {
    console.error("Admin verifications GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar verificações" },
      { status: 500 },
    );
  }
}

const reviewSchema = z.object({
  verificationId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
  reviewNote: z.string().optional(),
});

// PATCH /api/admin/verifications - Approve or reject a verification
export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();
    if (!(await isCurrentUserAdmin())) return forbiddenResponse();

    const body = await req.json();
    const { verificationId, action, reviewNote } = reviewSchema.parse(body);

    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Verificação não encontrada" },
        { status: 404 },
      );
    }

    if (verification.status !== "PENDING") {
      return NextResponse.json(
        { error: `Verificação já foi processada (${verification.status})` },
        { status: 400 },
      );
    }

    const updated = await prisma.verification.update({
      where: { id: verificationId },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewNote: reviewNote || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Admin verifications PATCH error:", error);
    return NextResponse.json(
      { error: "Erro ao processar verificação" },
      { status: 500 },
    );
  }
}
