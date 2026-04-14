# MMOMarket — Intermediação de Moedas Digitais para MMORPGs

Plataforma de compra e venda de moedas digitais de MMORPGs populares no Brasil, com segurança, verificação de fundos e pagamentos via MercadoPago.

## Funcionalidades

- **10 MMORPGs populares no Brasil**: Tibia, Mu Online, Ragnarok Online, Perfect World, Lineage 2, World of Warcraft, Guild Wars 2, Black Desert Online, Metin2, Dofus
- **Livro de Ordens**: Sistema de compra e venda com matching automático
- **Gráficos de Preço**: Visualização de oscilação de preços com indicadores
- **Taxa de 2%**: Taxa transparente sobre cada transação
- **Verificação de Fundos**: Vendedores devem comprovar posse dos fundos digitais via screenshot
- **Carteira Digital**: Depósitos em BRL via MercadoPago
- **Histórico de Trades**: Registro completo de todas as transações

## Tecnologias

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Prisma 7** (SQLite)
- **NextAuth.js** (autenticação com credenciais)
- **MercadoPago SDK** (pagamentos)
- **Recharts** (gráficos)
- **Zustand** (state management)
- **Zod** (validação)

## Setup

1. Clone o repositório e instale as dependências:

```bash
npm install
```

2. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

3. Configure as variáveis de ambiente no `.env`:
   - `NEXTAUTH_SECRET`: Gere com `openssl rand -base64 32`
   - `MERCADOPAGO_ACCESS_TOKEN`: Token do MercadoPago (https://www.mercadopago.com.br/developers)

4. Rode as migrações do banco de dados:

```bash
npm run db:migrate
```

5. Popule o banco com dados iniciais (jogos, moedas, preços):

```bash
npm run seed
```

6. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse http://localhost:3000

## Estrutura

```
src/
├── app/
│   ├── api/            # Rotas da API
│   │   ├── auth/       # Login e registro
│   │   ├── deposits/   # Depósitos BRL
│   │   ├── games/      # Lista de jogos
│   │   ├── orders/     # Ordens de compra/venda
│   │   ├── prices/     # Histórico de preços
│   │   ├── trades/     # Trades realizados
│   │   ├── upload/     # Upload de screenshots
│   │   ├── verifications/ # Verificação de fundos
│   │   ├── wallet/     # Carteira do usuário
│   │   └── webhooks/   # Webhooks MercadoPago
│   ├── carteira/       # Página da carteira
│   ├── historico/      # Página de histórico
│   ├── login/          # Página de login
│   ├── negociar/       # Página de negociação
│   ├── registro/       # Página de registro
│   ├── verificacao/    # Página de verificação
│   ├── layout.tsx      # Layout raiz
│   ├── page.tsx        # Página inicial (dashboard)
│   └── globals.css     # Estilos globais
├── components/
│   ├── charts/         # Componentes de gráficos
│   ├── layout/         # Navbar, etc.
│   ├── providers/      # SessionProvider
│   └── ui/             # Componentes reutilizáveis
├── lib/
│   ├── auth.ts         # Helpers de autenticação
│   ├── constants.ts    # Constantes (jogos, taxa)
│   ├── mercadopago.ts  # Config MercadoPago
│   ├── prisma.ts       # Cliente Prisma
│   └── utils.ts        # Utilitários
└── generated/          # Prisma client gerado
```

## Scripts

| Comando              | Descrição                   |
| -------------------- | --------------------------- |
| `npm run dev`        | Servidor de desenvolvimento |
| `npm run build`      | Build de produção           |
| `npm run seed`       | Popular banco de dados      |
| `npm run db:migrate` | Rodar migrações             |
| `npm run db:studio`  | Abrir Prisma Studio         |
