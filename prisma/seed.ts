import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";

const GAMES_DATA = [
  {
    name: "Tibia",
    slug: "tibia",
    image: "/games/tibia.png",
    description:
      "MMORPG clássico da CipSoft, extremamente popular no Brasil desde os anos 2000.",
    servers: [
      { name: "Inabra", slug: "inabra" },
      { name: "Ustebra", slug: "ustebra" },
    ],
    currencies: [
      { name: "Tibia Coins", code: "TC", unitLabel: "TC", minTrade: 1 },
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1000 },
    ],
  },
  {
    name: "Mu Online",
    slug: "mu-online",
    image: "/games/mu-online.png",
    description: "MMORPG coreano com grande base de jogadores brasileiros.",
    servers: [
      { name: "Gavea", slug: "gavea" },
      { name: "Arca", slug: "arca" },
    ],
    currencies: [
      { name: "Zen", code: "ZEN", unitLabel: "Zen", minTrade: 1000000 },
      { name: "WCoin", code: "WCOIN", unitLabel: "WCoin", minTrade: 1 },
      { name: "Jewel of Bless", code: "JOB", unitLabel: "JoB", minTrade: 1 },
    ],
  },
  {
    name: "Ragnarok Online",
    slug: "ragnarok-online",
    image: "/games/ragnarok.png",
    description: "MMORPG que marcou uma geração de jogadores brasileiros.",
    servers: [
      { name: "Valhalla", slug: "valhalla" },
      { name: "Yggdrasil", slug: "yggdrasil" },
    ],
    currencies: [
      { name: "Zeny", code: "ZENY", unitLabel: "Zeny", minTrade: 100000 },
      { name: "Kafra Points", code: "KP", unitLabel: "KP", minTrade: 1 },
    ],
  },
  {
    name: "Perfect World",
    slug: "perfect-world",
    image: "/games/perfect-world.png",
    description: "MMORPG com voo livre e PvP massivo, muito jogado no Brasil.",
    servers: [
      { name: "Tyr", slug: "tyr" },
      { name: "Arcadia", slug: "arcadia" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1 },
      { name: "Silver", code: "SILVER", unitLabel: "Silver", minTrade: 1000 },
    ],
  },
  {
    name: "Lineage 2",
    slug: "lineage-2",
    image: "/games/lineage2.png",
    description: "MMORPG épico com guerras de clã e sieges.",
    servers: [
      { name: "Aden", slug: "aden" },
      { name: "Bartz", slug: "bartz" },
    ],
    currencies: [
      { name: "Adena", code: "ADENA", unitLabel: "Adena", minTrade: 1000000 },
      { name: "NCoin", code: "NCOIN", unitLabel: "NCoin", minTrade: 1 },
    ],
  },
  {
    name: "World of Warcraft",
    slug: "world-of-warcraft",
    image: "/games/wow.png",
    description:
      "O MMORPG mais famoso do mundo, com comunidade ativa no Brasil.",
    servers: [
      { name: "Azralon", slug: "azralon" },
      { name: "Nemesis", slug: "nemesis" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1000 },
      { name: "WoW Token", code: "TOKEN", unitLabel: "Token", minTrade: 1 },
    ],
  },
  {
    name: "Guild Wars 2",
    slug: "guild-wars-2",
    image: "/games/gw2.png",
    description: "MMORPG buy-to-play com economia dinâmica.",
    servers: [
      { name: "Jade Quarry", slug: "jade-quarry" },
      { name: "Blackgate", slug: "blackgate" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1 },
      { name: "Gems", code: "GEMS", unitLabel: "Gems", minTrade: 100 },
    ],
  },
  {
    name: "Black Desert Online",
    slug: "black-desert-online",
    image: "/games/bdo.png",
    description:
      "MMORPG com gráficos incríveis e sistema de comércio complexo.",
    servers: [
      { name: "SA Olvia", slug: "sa-olvia" },
      { name: "SA Calpheon", slug: "sa-calpheon" },
    ],
    currencies: [
      {
        name: "Silver",
        code: "SILVER",
        unitLabel: "Silver",
        minTrade: 1000000,
      },
      { name: "Pearls", code: "PEARLS", unitLabel: "Pearl", minTrade: 1 },
    ],
  },
  {
    name: "Metin2",
    slug: "metin2",
    image: "/games/metin2.png",
    description: "MMORPG com temática oriental, muito popular no Brasil.",
    servers: [
      { name: "Tróia", slug: "troia" },
      { name: "Gaia", slug: "gaia" },
    ],
    currencies: [
      { name: "Yang", code: "YANG", unitLabel: "Yang", minTrade: 1000000 },
      { name: "Dragon Coins", code: "DC", unitLabel: "DC", minTrade: 1 },
    ],
  },
  {
    name: "Dofus",
    slug: "dofus",
    image: "/games/dofus.png",
    description: "MMORPG tático com estilo visual único e economia rica.",
    servers: [
      { name: "Draconiros", slug: "draconiros" },
      { name: "Imagiro", slug: "imagiro" },
    ],
    currencies: [
      { name: "Kamas", code: "KAMAS", unitLabel: "Kama", minTrade: 100000 },
      { name: "Ogrines", code: "OGRINES", unitLabel: "Ogrine", minTrade: 1 },
    ],
  },
];

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createAdapter() {
  if (process.env.TURSO_DATABASE_URL) {
    console.log("Using Turso/LibSQL adapter");
    return new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  const dbPath = path.resolve(__dirname, "..", "dev.db");
  console.log("DB path:", dbPath);
  return new PrismaBetterSqlite3({ url: dbPath });
}

const adapter = createAdapter();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding database...");

  for (const game of GAMES_DATA) {
    const createdGame = await prisma.game.upsert({
      where: { slug: game.slug },
      update: {
        name: game.name,
        image: game.image,
        description: game.description,
      },
      create: {
        name: game.name,
        slug: game.slug,
        image: game.image,
        description: game.description,
      },
    });

    console.log(`  🎮 ${createdGame.name}`);

    // Seed servers
    for (const server of game.servers) {
      await prisma.server.upsert({
        where: {
          slug_gameId: {
            slug: server.slug,
            gameId: createdGame.id,
          },
        },
        update: {
          name: server.name,
        },
        create: {
          name: server.name,
          slug: server.slug,
          gameId: createdGame.id,
        },
      });
      console.log(`    🖥️  ${server.name}`);
    }

    for (const currency of game.currencies) {
      await prisma.currency.upsert({
        where: {
          code_gameId: {
            code: currency.code,
            gameId: createdGame.id,
          },
        },
        update: {
          name: currency.name,
          unitLabel: currency.unitLabel,
          minTrade: currency.minTrade,
        },
        create: {
          name: currency.name,
          code: currency.code,
          gameId: createdGame.id,
          unitLabel: currency.unitLabel,
          minTrade: currency.minTrade,
        },
      });
      console.log(`    💰 ${currency.name} (${currency.code})`);
    }
  }

  // Create sample price history data for demo purposes
  const currencies = await prisma.currency.findMany({
    include: { game: true },
  });
  const servers = await prisma.server.findMany();

  // Build a map of gameId -> serverIds for quick lookup
  const gameServersMap = new Map<string, string[]>();
  for (const srv of servers) {
    if (!gameServersMap.has(srv.gameId)) {
      gameServersMap.set(srv.gameId, []);
    }
    gameServersMap.get(srv.gameId)!.push(srv.id);
  }

  const now = new Date();
  for (const currency of currencies) {
    const gameServerIds = gameServersMap.get(currency.gameId) || [];

    // Generate price history per server
    for (const serverId of gameServerIds) {
      // Generate 30 days of hourly price history
      let basePrice = Math.random() * 0.05 + 0.001; // Random base price in BRL
      for (let day = 30; day >= 0; day--) {
        for (let hour = 0; hour < 24; hour += 4) {
          // every 4 hours
          const fluctuation = (Math.random() - 0.48) * 0.002; // slight upward bias
          basePrice = Math.max(0.0001, basePrice + fluctuation);

          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - day);
          timestamp.setHours(hour, 0, 0, 0);

          const volume = Math.random() * 10000 + 100;
          const minPrice = basePrice * (1 - Math.random() * 0.05);
          const maxPrice = basePrice * (1 + Math.random() * 0.05);

          await prisma.priceHistory.create({
            data: {
              currencyId: currency.id,
              serverId,
              avgPrice: basePrice,
              minPrice,
              maxPrice,
              volume,
              volumeBRL: volume * basePrice,
              period: "4h",
              timestamp,
            },
          });
        }
      }
      const srv = servers.find((s) => s.id === serverId);
      console.log(
        `  📊 Price history for ${currency.name} (${currency.game.name} - ${srv?.name})`,
      );
    }
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
