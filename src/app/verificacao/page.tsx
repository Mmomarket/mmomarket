"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Game {
  id: string;
  name: string;
  slug: string;
  currencies: Currency[];
  servers: Server[];
}

interface Currency {
  id: string;
  name: string;
  code: string;
}

interface Server {
  id: string;
  name: string;
  slug: string;
}

interface Verification {
  id: string;
  status: string;
  characterName: string;
  screenshotUrl: string | null;
  amount: number;
  notes: string | null;
  createdAt: string;
  serverRef: Server | null;
  currency: { name: string; code: string; game: { name: string } };
}

export default function VerificacaoPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [games, setGames] = useState<Game[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedCurrencyId, setSelectedCurrencyId] = useState("");
  const [selectedServerId, setSelectedServerId] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadVerifications = useCallback(() => {
    if (!session) return;
    fetch("/api/verifications")
      .then((r) => r.json())
      .then(setVerifications)
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session) {
      fetch("/api/games")
        .then((r) => r.json())
        .then((data) => {
          setGames(data);
          if (data.length > 0) {
            setSelectedGameId(data[0].id);
            if (data[0].currencies.length > 0) {
              setSelectedCurrencyId(data[0].currencies[0].id);
            }
            if (data[0].servers.length > 0) {
              setSelectedServerId(data[0].servers[0].id);
            }
          }
        });
      loadVerifications();
    }
  }, [session, sessionStatus, router, loadVerifications]);

  const selectedGame = games.find((g) => g.id === selectedGameId);
  const currencies = selectedGame?.currencies || [];
  const servers = selectedGame?.servers || [];

  const handleGameChange = (gameId: string) => {
    setSelectedGameId(gameId);
    const game = games.find((g) => g.id === gameId);
    if (game && game.currencies.length > 0) {
      setSelectedCurrencyId(game.currencies[0].id);
    } else {
      setSelectedCurrencyId("");
    }
    if (game && game.servers.length > 0) {
      setSelectedServerId(game.servers[0].id);
    } else {
      setSelectedServerId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      let screenshotUrl = "";

      // Upload screenshot first
      if (screenshot) {
        const formData = new FormData();
        formData.append("file", screenshot);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData.error || "Erro ao enviar screenshot");
          return;
        }
        screenshotUrl = uploadData.url;
      }

      const res = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currencyId: selectedCurrencyId,
          serverId: selectedServerId,
          characterName,
          amount: parseFloat(amount),
          screenshotUrl: screenshotUrl || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar verificação");
        return;
      }

      setSuccess("Verificação enviada com sucesso! Aguarde a análise.");
      setCharacterName("");
      setAmount("");
      setNotes("");
      setScreenshot(null);
      loadVerifications();
    } catch {
      setError("Erro ao criar verificação");
    } finally {
      setSubmitting(false);
    }
  };

  const statusMap: Record<
    string,
    { label: string; variant: "success" | "warning" | "danger" | "default" }
  > = {
    PENDING: { label: "Pendente", variant: "warning" },
    APPROVED: { label: "Aprovada", variant: "success" },
    REJECTED: { label: "Rejeitada", variant: "danger" },
  };

  if (sessionStatus === "loading") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verificação de Fundos</h1>
        <p className="text-gray-500 mt-1">
          Comprove que você possui os fundos digitais antes de vender. Envie um
          screenshot do seu inventário do jogo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verification Form */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Nova Verificação</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-sm px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}

              <Select
                id="game"
                label="Jogo"
                value={selectedGameId}
                onChange={(e) => handleGameChange(e.target.value)}
                options={games.map((g) => ({ value: g.id, label: g.name }))}
                placeholder="Selecione o jogo"
              />

              <Select
                id="currency"
                label="Moeda"
                value={selectedCurrencyId}
                onChange={(e) => setSelectedCurrencyId(e.target.value)}
                options={currencies.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
                placeholder="Selecione a moeda"
              />

              <Select
                id="server"
                label="Servidor"
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(e.target.value)}
                options={servers.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
                placeholder="Selecione o servidor"
              />

              <Input
                id="characterName"
                label="Nome do Personagem"
                type="text"
                placeholder="Ex: SirKnight2024"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                required
              />

              <Input
                id="amount"
                label="Quantidade Disponível"
                type="number"
                placeholder="Quanto você tem para vender"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                step="any"
              />

              {/* Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  Screenshot do Inventário
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-gray-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                    className="hidden"
                    id="screenshot"
                  />
                  <label htmlFor="screenshot" className="cursor-pointer">
                    {screenshot ? (
                      <div>
                        <p className="text-sm text-emerald-400 font-medium">
                          {screenshot.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(screenshot.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-400">
                          Clique para selecionar uma imagem
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          PNG, JPG ou WebP — Máx. 5MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <Input
                id="notes"
                label="Observações (opcional)"
                type="text"
                placeholder="Informações adicionais..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <Button
                type="submit"
                loading={submitting}
                className="w-full"
                size="lg"
              >
                Enviar Verificação
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Como Funciona?</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-emerald-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-400 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Envie uma prova
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Faça um screenshot mostrando seu inventário ou saldo no jogo
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-emerald-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-400 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Análise</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nossa equipe verifica se as informações conferem
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-emerald-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-400 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Aprovação</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Após aprovada, você pode criar ordens de venda
                </p>
              </div>
            </div>
            <hr className="border-gray-700" />
            <p className="text-xs text-gray-500">
              A verificação garante segurança para os compradores e reduz
              fraudes na plataforma.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Verification History */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Minhas Verificações</h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : verifications.length === 0 ? (
            <EmptyState
              title="Nenhuma verificação"
              description="Envie sua primeira verificação para começar a vender!"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-700/50">
                    <th className="text-left py-2 font-medium">Data</th>
                    <th className="text-left py-2 font-medium">Jogo / Moeda</th>
                    <th className="text-left py-2 font-medium">Servidor</th>
                    <th className="text-left py-2 font-medium">Personagem</th>
                    <th className="text-right py-2 font-medium">Quantidade</th>
                    <th className="text-right py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.map((v) => {
                    const st = statusMap[v.status] || {
                      label: v.status,
                      variant: "default" as const,
                    };
                    return (
                      <tr key={v.id} className="border-b border-gray-800/50">
                        <td className="py-3 text-gray-400 text-xs">
                          {new Date(v.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3">
                          <p className="text-white text-sm">
                            {v.currency.game.name}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {v.currency.code}
                          </p>
                        </td>
                        <td className="py-3 text-gray-400 text-xs">
                          {v.serverRef?.name || "—"}
                        </td>
                        <td className="py-3 text-gray-300">
                          {v.characterName}
                        </td>
                        <td className="py-3 text-right text-white font-medium">
                          {v.amount.toLocaleString("pt-BR")}
                        </td>
                        <td className="py-3 text-right">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
