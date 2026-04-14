"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { formatBRL, formatNumber } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

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
  unitLabel: string;
}

interface Server {
  id: string;
  name: string;
  slug: string;
}

interface Order {
  id: string;
  type: "BUY" | "SELL";
  status: string;
  amount: number;
  pricePerUnit: number;
  totalBRL: number;
  filledAmount: number;
  server: string | null;
  serverId: string | null;
  serverRef: Server | null;
  createdAt: string;
  currency: { name: string; code: string; game: { name: string } };
  user: { name: string };
}

export default function NegociarPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-96" />
        </div>
      }
    >
      <NegociarContent />
    </Suspense>
  );
}

function NegociarContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedCurrencyId, setSelectedCurrencyId] = useState("");
  const [selectedServerId, setSelectedServerId] = useState("");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [server, setServer] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load games
  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => {
        setGames(data);
        const gameSlug = searchParams.get("game");
        if (gameSlug) {
          const found = data.find((g: Game) => g.slug === gameSlug);
          if (found) {
            setSelectedGameId(found.id);
            if (found.currencies.length > 0) {
              setSelectedCurrencyId(found.currencies[0].id);
            }
            if (found.servers.length > 0) {
              setSelectedServerId(found.servers[0].id);
            }
          }
        } else if (data.length > 0) {
          setSelectedGameId(data[0].id);
          if (data[0].currencies.length > 0) {
            setSelectedCurrencyId(data[0].currencies[0].id);
          }
          if (data[0].servers.length > 0) {
            setSelectedServerId(data[0].servers[0].id);
          }
        }
      })
      .finally(() => setLoadingGames(false));
  }, [searchParams]);

  // Load orders
  const loadOrders = useCallback(() => {
    if (!selectedCurrencyId || !selectedServerId) return;
    setLoadingOrders(true);
    fetch(
      `/api/orders?currencyId=${selectedCurrencyId}&serverId=${selectedServerId}`,
    )
      .then((r) => r.json())
      .then(setOrders)
      .finally(() => setLoadingOrders(false));
  }, [selectedCurrencyId, selectedServerId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const selectedGame = games.find((g) => g.id === selectedGameId);
  const currencies = selectedGame?.currencies || [];
  const servers = selectedGame?.servers || [];

  const totalBRL = parseFloat(amount || "0") * parseFloat(pricePerUnit || "0");
  const fee = totalBRL * (PLATFORM_FEE_PERCENT / 100);
  const netTotal = orderType === "SELL" ? totalBRL - fee : totalBRL + fee;

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
    if (!session) {
      router.push("/login");
      return;
    }
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currencyId: selectedCurrencyId,
          serverId: selectedServerId,
          type: orderType,
          amount: parseFloat(amount),
          pricePerUnit: parseFloat(pricePerUnit),
          server: server || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar ordem");
        return;
      }

      setSuccess(
        `Ordem de ${orderType === "BUY" ? "compra" : "venda"} criada com sucesso!${
          data.matchedTrades > 0
            ? ` ${data.matchedTrades} trade(s) executado(s)!`
            : ""
        }`,
      );
      setAmount("");
      setPricePerUnit("");
      setServer("");
      loadOrders();
    } catch {
      setError("Erro ao criar ordem");
    } finally {
      setSubmitting(false);
    }
  };

  const buyOrders = orders.filter(
    (o) =>
      o.type === "BUY" && o.status !== "CANCELLED" && o.status !== "FILLED",
  );
  const sellOrders = orders.filter(
    (o) =>
      o.type === "SELL" && o.status !== "CANCELLED" && o.status !== "FILLED",
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Negociar</h1>
        <p className="text-gray-500 mt-1">
          Crie ordens de compra e venda de moedas digitais
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Nova Ordem</h2>
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

              {/* Order Type Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType("BUY")}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    orderType === "BUY"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Comprar
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("SELL")}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    orderType === "SELL"
                      ? "bg-red-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  Vender
                </button>
              </div>

              {loadingGames ? (
                <Skeleton className="h-10" />
              ) : (
                <>
                  <Select
                    id="game"
                    label="Jogo"
                    value={selectedGameId}
                    onChange={(e) => handleGameChange(e.target.value)}
                    options={games.map((g) => ({ value: g.id, label: g.name }))}
                    placeholder="Selecione o jogo"
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
                </>
              )}

              <Input
                id="amount"
                label="Quantidade"
                type="number"
                placeholder="Ex: 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0"
                step="any"
              />

              <Input
                id="price"
                label="Preço por Unidade (BRL)"
                type="number"
                placeholder="Ex: 0.50"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                required
                min="0"
                step="any"
              />

              <Input
                id="server"
                label="Personagem (opcional)"
                type="text"
                placeholder="Ex: SirKnight2024"
                value={server}
                onChange={(e) => setServer(e.target.value)}
              />

              {/* Summary */}
              {totalBRL > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>{formatBRL(totalBRL)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Taxa ({PLATFORM_FEE_PERCENT}%)</span>
                    <span className="text-yellow-400">{formatBRL(fee)}</span>
                  </div>
                  <hr className="border-gray-700" />
                  <div className="flex justify-between font-medium text-white">
                    <span>
                      {orderType === "BUY" ? "Total a Pagar" : "Você Recebe"}
                    </span>
                    <span
                      className={
                        orderType === "BUY"
                          ? "text-red-400"
                          : "text-emerald-400"
                      }
                    >
                      {formatBRL(netTotal)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                loading={submitting}
                variant={orderType === "BUY" ? "primary" : "danger"}
                className="w-full"
                size="lg"
              >
                {orderType === "BUY"
                  ? "Criar Ordem de Compra"
                  : "Criar Ordem de Venda"}
              </Button>

              {!session && (
                <p className="text-xs text-gray-500 text-center">
                  Você precisa estar logado para criar ordens
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Order Book */}
        <div className="lg:col-span-2 space-y-6">
          {/* Buy Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-emerald-400">
                  Ordens de Compra ({buyOrders.length})
                </h2>
                <Badge variant="success">Compradores</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : buyOrders.length === 0 ? (
                <EmptyState
                  title="Nenhuma ordem de compra"
                  description="Seja o primeiro a criar uma ordem de compra!"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b border-gray-700/50">
                        <th className="text-left py-2 font-medium">Usuário</th>
                        <th className="text-right py-2 font-medium">
                          Quantidade
                        </th>
                        <th className="text-right py-2 font-medium">
                          Preço/Un
                        </th>
                        <th className="text-right py-2 font-medium">Total</th>
                        <th className="text-right py-2 font-medium">
                          Servidor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {buyOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-gray-800/50 hover:bg-gray-800/30"
                        >
                          <td className="py-3 text-gray-300">
                            {order.user.name}
                          </td>
                          <td className="py-3 text-right text-white font-medium">
                            {formatNumber(order.amount - order.filledAmount)}
                          </td>
                          <td className="py-3 text-right text-emerald-400">
                            {formatBRL(order.pricePerUnit)}
                          </td>
                          <td className="py-3 text-right text-white">
                            {formatBRL(order.totalBRL)}
                          </td>
                          <td className="py-3 text-right text-gray-500 text-xs">
                            {order.serverRef?.name || order.server || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sell Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-red-400">
                  Ordens de Venda ({sellOrders.length})
                </h2>
                <Badge variant="danger">Vendedores</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : sellOrders.length === 0 ? (
                <EmptyState
                  title="Nenhuma ordem de venda"
                  description="Seja o primeiro a criar uma ordem de venda!"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b border-gray-700/50">
                        <th className="text-left py-2 font-medium">Usuário</th>
                        <th className="text-right py-2 font-medium">
                          Quantidade
                        </th>
                        <th className="text-right py-2 font-medium">
                          Preço/Un
                        </th>
                        <th className="text-right py-2 font-medium">Total</th>
                        <th className="text-right py-2 font-medium">
                          Servidor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-gray-800/50 hover:bg-gray-800/30"
                        >
                          <td className="py-3 text-gray-300">
                            {order.user.name}
                          </td>
                          <td className="py-3 text-right text-white font-medium">
                            {formatNumber(order.amount - order.filledAmount)}
                          </td>
                          <td className="py-3 text-right text-red-400">
                            {formatBRL(order.pricePerUnit)}
                          </td>
                          <td className="py-3 text-right text-white">
                            {formatBRL(order.totalBRL)}
                          </td>
                          <td className="py-3 text-right text-gray-500 text-xs">
                            {order.serverRef?.name || order.server || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
