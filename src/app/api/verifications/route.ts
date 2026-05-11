import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const verificationSchema = z.object({
  phone: z.string().min(10, "Telefone inválido").max(20),
  selfieUrl: z.string().url("URL da selfie inválida"),
  idFrontUrl: z.string().url("URL do documento (frente) inválida"),
  idBackUrl: z.string().url().optional(),
});

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const verification = await prisma.verification.findUnique({
      where: { userId },
    });

    return NextResponse.json(verification ?? null);
  } catch (error) {
    console.error("Verifications GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar verificação" },
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

    // If already approved, don't allow resubmission
    const existing = await prisma.verification.findUnique({
      where: { userId },
    });
    if (existing?.status === "APPROVED") {
      return NextResponse.json(
        { error: "Sua identidade já foi verificada." },
        { status: 409 },
      );
    }

    // Upsert: user can resubmit if REJECTED
    const verification = await prisma.verification.upsert({
      where: { userId },
      create: {
        userId,
        phone: data.phone,
        selfieUrl: data.selfieUrl,
        idFrontUrl: data.idFrontUrl,
        idBackUrl: data.idBackUrl ?? null,
        status: "PENDING",
      },
      update: {
        phone: data.phone,
        selfieUrl: data.selfieUrl,
        idFrontUrl: data.idFrontUrl,
        idBackUrl: data.idBackUrl ?? null,
        status: "PENDING",
        reviewNote: null,
        reviewedAt: null,
        submittedAt: new Date(),
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
      { error: "Erro ao enviar verificação" },
      { status: 500 },
    );
  }
}
