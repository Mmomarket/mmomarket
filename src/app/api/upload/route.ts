import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Upload de arquivos não é mais suportado." },
    { status: 410 },
  );
}
