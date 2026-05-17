"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HistoricoRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/perfil");
  }, [router]);
  return null;
}
