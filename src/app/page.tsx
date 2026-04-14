"use client";

import PriceChart from "@/components/charts/PriceChart";
import Badge from "@/components/ui/Badge";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { formatBRL, formatPercent } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Game {
  id: string;
  name: string;
  slug: string;
  image: string;
  currencies: Currency[];
  servers: Server[];
}

interface Currency {
  id: string;
  name: string;
  code: string;
  unitLabel: string;
  gameId: string;
}

interface Server {
  id: string;
  name: string;
  slug: string;
}

interface PriceStats {
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  high: number;
  low: number;
  volume: number;
  history: { timestamp: string; price: number; volume: number }[];
}

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    null,
  );
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [priceData, setPriceData] = useState<PriceStats | null>(null);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => {
        setGames(data);
        if (data.length > 0) {
          setSelectedGame(data[0]);
          if (data[0].currencies.length > 0) {
            setSelectedCurrency(data[0].currencies[0]);
          }
          if (data[0].servers.length > 0) {
            setSelectedServer(data[0].servers[0]);
          }
        }
      })
      .finally(() => setLoadingGames(false));
  }, []);

  useEffect(() => {
    if (!selectedCurrency || !selectedServer) return;
    let cancelled = false;
    const loadPrices = async () => {
      try {
        const res = await fetch(
          `/api/prices?currencyId=${selectedCurrency.id}&serverId=${selectedServer.id}&days=30`,
        );
        const data = await res.json();
        if (!cancelled) {
          setPriceData({
            currentPrice: data.stats?.currentPrice ?? 0,
            priceChange: data.stats?.priceChange ?? 0,
            priceChangePercent: data.stats?.priceChangePercent ?? 0,
            high: data.stats?.high ?? 0,
            low: data.stats?.low ?? 0,
            volume: data.stats?.totalVolume ?? 0,
            history: (data.history ?? []).map(
              (h: { timestamp: string; avgPrice: number; volume: number }) => ({
                timestamp: h.timestamp,
                price: h.avgPrice,
                volume: h.volume,
              }),
            ),
          });
        }
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    };
    setLoadingPrices(true);
    loadPrices();
    return () => {
      cancelled = true;
    };
  }, [selectedCurrency, selectedServer]);

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    if (game.currencies.length > 0) {
      setSelectedCurrency(game.currencies[0]);
    } else {
      setSelectedCurrency(null);
      setPriceData(null);
    }
    if (game.servers.length > 0) {
      setSelectedServer(game.servers[0]);
    } else {
      setSelectedServer(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Negocie moedas de{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            MMORPGs
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Compre e venda moedas digitais dos maiores MMORPGs do Brasil com
          segurança. Taxa de apenas 2% por transação.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/negociar"
            className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-500 transition-colors"
          >
            Começar a Negociar
          </Link>
          <Link
            href="/registro"
            className="px-6 py-3 bg-gray-800 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Criar Conta
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-2xl font-bold text-emerald-400">10</p>
            <p className="text-xs text-gray-500 mt-1">Jogos Disponíveis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-2xl font-bold text-emerald-400">21</p>
            <p className="text-xs text-gray-500 mt-1">Moedas Listadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-2xl font-bold text-emerald-400">2%</p>
            <p className="text-xs text-gray-500 mt-1">Taxa por Transação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-2xl font-bold text-emerald-400">24/7</p>
            <p className="text-xs text-gray-500 mt-1">Mercado Aberto</p>
          </CardContent>
        </Card>
      </div>

      {/* Game Selector */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Jogos</h2>
        {loadingGames ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => handleGameSelect(game)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedGame?.id === game.id
                    ? "bg-emerald-900/30 border-emerald-600/50 ring-1 ring-emerald-500/30"
                    : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800"
                }`}
              >
                <p className="font-medium text-sm text-white truncate">
                  {game.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {game.servers.length} servidor
                  {game.servers.length !== 1 ? "es" : ""} ·{" "}
                  {game.currencies.length} moeda
                  {game.currencies.length !== 1 ? "s" : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Currency Tabs + Price Chart */}
      {selectedGame && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedCurrency?.name || "Selecione uma moeda"}{" "}
                    <span className="text-gray-500 font-normal">
                      — {selectedGame.name}
                      {selectedServer && ` · ${selectedServer.name}`}
                    </span>
                  </h3>
                  {priceData && (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-2xl font-bold text-white">
                        {formatBRL(priceData.currentPrice)}
                      </span>
                      <Badge
                        variant={
                          priceData.priceChangePercent >= 0
                            ? "success"
                            : "danger"
                        }
                      >
                        {formatPercent(priceData.priceChangePercent)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              {/* Currency pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedGame.currencies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCurrency(c)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                      selectedCurrency?.id === c.id
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
              {/* Server pills */}
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedGame.servers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedServer(s)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                      selectedServer?.id === s.id
                        ? "bg-teal-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    🖥️ {s.name}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loadingPrices ? (
                <Skeleton className="h-[250px]" />
              ) : priceData ? (
                <PriceChart
                  data={priceData.history}
                  positive={priceData.priceChangePercent >= 0}
                  height={250}
                />
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                  Selecione uma moeda para ver o gráfico
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-white text-sm">
                  Estatísticas (30 dias)
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPrices ? (
                  <>
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </>
                ) : priceData ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Preço Atual</span>
                      <span className="text-sm font-medium text-white">
                        {formatBRL(priceData.currentPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Variação</span>
                      <span
                        className={`text-sm font-medium ${
                          priceData.priceChangePercent >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercent(priceData.priceChangePercent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Máxima</span>
                      <span className="text-sm font-medium text-emerald-400">
                        {formatBRL(priceData.high)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Mínima</span>
                      <span className="text-sm font-medium text-red-400">
                        {formatBRL(priceData.low)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Volume</span>
                      <span className="text-sm font-medium text-white">
                        {priceData.volume.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <hr className="border-gray-700" />
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Amplitude</span>
                      <span className="text-sm font-medium text-yellow-400">
                        {formatBRL(priceData.high - priceData.low)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Selecione uma moeda
                  </p>
                )}
              </CardContent>
            </Card>

            <Card hover>
              <Link href="/negociar">
                <CardContent className="text-center py-6">
                  <p className="text-emerald-400 font-semibold">
                    💱 Negociar Agora
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Criar ordens de compra e venda
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card hover>
              <Link href="/carteira">
                <CardContent className="text-center py-6">
                  <p className="text-emerald-400 font-semibold">
                    💰 Minha Carteira
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Depositar BRL e gerenciar saldo
                  </p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>
      )}

      {/* All Games Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Visão Geral dos Jogos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <Card key={game.id} hover>
              <CardContent className="py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{game.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {game.currencies.map((c) => c.code).join(", ")}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      🖥️ {game.servers.map((s) => s.name).join(", ")}
                    </p>
                  </div>
                  <Link
                    href={`/negociar?game=${game.slug}`}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Negociar →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
