"use client";

import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import { useCallback, useEffect, useRef, useState } from "react";

interface Game {
  id: string;
  name: string;
  slug: string;
  servers: { id: string; name: string }[];
}

interface Verification {
  id: string;
  gameSlug: string;
  serverId: string | null;
  characterName: string;
  screenshotUrl: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Aguardando revisão", color: "text-yellow-400" },
  APPROVED: { label: "Aprovada ✓", color: "text-emerald-400" },
  REJECTED: { label: "Reprovada", color: "text-red-400" },
};

export default function VerificacaoPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [existing, setExisting] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [gameSlug, setGameSlug] = useState("");
  const [serverId, setServerId] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // file upload state
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedGame = games.find((g) => g.slug === gameSlug);
  const servers = selectedGame?.servers ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gamesRes, vRes] = await Promise.all([
        fetch("/api/games"),
        fetch("/api/verifications"),
      ]);
      if (gamesRes.ok) setGames(await gamesRes.json());
      if (vRes.ok) setExisting(await vRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset serverId when game changes
  useEffect(() => {
    setServerId("");
  }, [gameSlug]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Erro ao fazer upload");
      }
      const { url } = await res.json();
      setScreenshotUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!screenshotUrl) {
      setError("Envie o print antes de continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameSlug,
          serverId,
          characterName,
          screenshotUrl,
          amount: parseFloat(amount),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao enviar");
        return;
      }
      setSuccess(true);
      await load();
    } catch {
      setError("Erro ao enviar verificação");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400">
        Carregando…
      </div>
    );
  }

  // Check if any existing verification is PENDING or APPROVED for any server
  const hasPendingOrApproved = existing.some(
    (v) => v.status === "PENDING" || v.status === "APPROVED",
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verificação de Vendedor</h1>
        <p className="text-gray-400 mt-1">
          Para criar ordens de venda, você precisa comprovar que possui as
          moedas/itens no jogo. Envie um print mostrando seu saldo.
        </p>
      </div>

      {/* Existing verifications */}
      {existing.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Suas Verificações</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {existing.map((v) => {
              const s = STATUS_LABEL[v.status] ?? STATUS_LABEL.PENDING;
              return (
                <div
                  key={v.id}
                  className="flex items-start justify-between gap-3 p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-white">
                      {v.characterName}{" "}
                      <span className="text-gray-400 font-normal">
                        — {v.gameSlug.toUpperCase()}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {v.amount.toLocaleString("pt-BR")} unidades •{" "}
                      {new Date(v.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                    {v.reviewNote && (
                      <p className="text-xs text-gray-300 italic mt-1">
                        Nota: {v.reviewNote}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${s.color}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Success state */}
      {success && (
        <div className="bg-emerald-900/40 border border-emerald-700 rounded-lg p-4 text-sm text-emerald-300">
          ✅ Verificação enviada! Nossa equipe irá analisar em até 24 horas.
        </div>
      )}

      {/* New verification form */}
      {!success && !hasPendingOrApproved && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Enviar Verificação</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Game */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Jogo *
                </label>
                <select
                  required
                  value={gameSlug}
                  onChange={(e) => setGameSlug(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Selecione o jogo</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.slug}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Server */}
              {servers.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Servidor *
                  </label>
                  <select
                    required
                    value={serverId}
                    onChange={(e) => setServerId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione o servidor</option>
                    {servers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Character name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Nome do Personagem *
                </label>
                <input
                  required
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="Ex: MeuChar123"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Quantidade de moedas/itens que deseja vender *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex: 100000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Screenshot */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Print do saldo no jogo *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploading ? "Enviando…" : "📎 Escolher arquivo"}
                  </button>
                  {screenshotUrl && (
                    <a
                      href={screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 underline"
                    >
                      Ver print enviado ↗
                    </a>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG ou GIF. O print deve mostrar claramente o seu saldo.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {submitting ? "Enviando…" : "Enviar para Revisão"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Already pending/approved */}
      {!success && hasPendingOrApproved && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-300">
          Você já possui uma verificação pendente ou aprovada. Quando precisar
          verificar um novo servidor, volte aqui após a revisão.
        </div>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Como funciona</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              step: "1",
              title: "Envie o print",
              desc: "Capture uma tela do jogo mostrando o seu saldo ou inventário. O print deve ser legível e exibir claramente seu personagem e quantidade.",
            },
            {
              step: "2",
              title: "Revisão em até 24h",
              desc: "Nossa equipe analisa manualmente cada solicitação. Você receberá uma notificação ao email cadastrado com o resultado.",
            },
            {
              step: "3",
              title: "Crie ordens de venda",
              desc: "Com a verificação aprovada, você pode criar ordens de venda no servidor verificado. O ✓ aparecerá ao lado do seu nome no livro de ordens.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-7 h-7 bg-emerald-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-400 font-bold text-xs">
                  {step}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
