"use client";

import Badge from "@/components/ui/Badge";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface PublicProfile {
  id: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  isVerified: boolean;
  completedSales: number;
  completedPurchases: number;
  totalTrades: number;
}

export default function PublicPerfilPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/perfil/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setProfile(await res.json());
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-20 w-80" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-400 mb-4">
          <svg
            className="w-8 h-8 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </p>
        <h1 className="text-xl font-bold text-white">Usuário não encontrado</h1>
        <p className="text-gray-500 mt-2">
          Este perfil não existe ou foi removido.
        </p>
      </div>
    );
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl font-bold text-white">
          {profile.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">
              {profile.name ?? "Usuário"}
            </h1>
            {profile.isVerified && (
              <span className="inline-flex items-center gap-1 text-xs bg-teal-900/50 text-teal-300 border border-teal-700/50 px-2 py-0.5 font-medium">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Verificado
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Membro desde {memberSince}
          </p>
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white text-sm">Reputação</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                {profile.totalTrades}
              </p>
              <p className="text-xs text-gray-500 mt-1">Trades Concluídos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-400">
                {profile.completedSales}
              </p>
              <p className="text-xs text-gray-500 mt-1">Vendas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">
                {profile.completedPurchases}
              </p>
              <p className="text-xs text-gray-500 mt-1">Compras</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white text-sm">
            Verificação de Identidade
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {profile.isVerified ? (
              <>
                <Badge variant="success">Identidade Verificada</Badge>
                <p className="text-xs text-gray-400">
                  Este usuário passou pela verificação KYC da plataforma.
                </p>
              </>
            ) : (
              <>
                <Badge variant="default">Não Verificado</Badge>
                <p className="text-xs text-gray-500">
                  Este usuário ainda não completou a verificação de identidade.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-gray-700">
        Por privacidade, detalhes de transações individuais não são exibidos
        publicamente.
      </p>
    </div>
  );
}
