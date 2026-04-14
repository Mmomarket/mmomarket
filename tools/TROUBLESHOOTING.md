# MMOMarket — Troubleshooting Strategy

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                   BROWSER (Client)                        │
│  Next.js Pages (React 19) + TailwindCSS v4               │
│  ├─ / (Homepage — market overview + price charts)         │
│  ├─ /login /registro (Auth pages)                         │
│  ├─ /negociar (Order book + create orders)                │
│  ├─ /carteira (Wallet — deposit/withdraw BRL)             │
│  ├─ /verificacao (Seller fund verification)               │
│  ├─ /historico (Trade history + delivery management)      │
│  └─ /admin (Admin panel — verifications + disputes)       │
├──────────────────────────────────────────────────────────┤
│                   API ROUTES (Server)                     │
│  Next.js 16 App Router — /api/*                           │
│  ├─ /api/auth/* (NextAuth v4 — credentials, JWT)          │
│  ├─ /api/games (Game/currency listing)                    │
│  ├─ /api/orders (Order CRUD + matching engine)            │
│  ├─ /api/trades (Trade listing)                           │
│  ├─ /api/trades/[id] (Trade actions: deliver/confirm)     │
│  ├─ /api/wallet /deposits /withdrawals (Financial)        │
│  ├─ /api/prices (Price history for charts)                │
│  ├─ /api/verifications (Seller verification)              │
│  ├─ /api/upload (Screenshot upload)                       │
│  ├─ /api/webhooks/mercadopago (Payment webhook)           │
│  └─ /api/admin/* (Admin: stats, verifications, disputes)  │
├──────────────────────────────────────────────────────────┤
│                   DATA LAYER                              │
│  Prisma 7 + better-sqlite3 adapter → SQLite (dev.db)     │
│  MercadoPago SDK (deposits via PIX)                       │
└──────────────────────────────────────────────────────────┘
```

## Troubleshooting Layers

### Layer 1: Infrastructure & Environment

| Check                  | Command                     | Expected                                    |
| ---------------------- | --------------------------- | ------------------------------------------- |
| Node.js version        | `node --version`            | v18+                                        |
| Dependencies installed | `npm ls --depth=0`          | No missing                                  |
| .env exists            | `cat .env`                  | DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET |
| SQLite DB exists       | `ls dev.db`                 | File present                                |
| Prisma generated       | `ls src/generated/prisma/`  | client.ts etc.                              |
| DB schema applied      | `npx prisma migrate status` | All applied                                 |
| DB seeded              | `npm run seed`              | Games + currencies created                  |
| Build succeeds         | `npx next build`            | No errors                                   |
| Dev server starts      | `npm run dev`               | Listening on :3000                          |

**Quick fix commands:**

```bash
npm install                           # Reinstall deps
npx prisma generate                   # Regenerate client
npx prisma migrate dev                # Apply migrations
npm run seed                          # Seed database
```

### Layer 2: API Endpoints

| Endpoint                    | Method    | Auth   | What to check                                      |
| --------------------------- | --------- | ------ | -------------------------------------------------- |
| `/api/games`                | GET       | No     | Returns array of 10 games with currencies          |
| `/api/prices`               | GET       | No     | Returns history + stats object                     |
| `/api/orders`               | GET       | No     | Returns array of orders                            |
| `/api/orders`               | POST      | Yes    | Creates order, runs matching engine                |
| `/api/auth/register`        | POST      | No     | Creates user + wallet                              |
| `/api/auth/session`         | GET       | Cookie | Returns session or empty                           |
| `/api/wallet`               | GET       | Yes    | Returns wallet with balanceBRL/frozenBRL/escrowBRL |
| `/api/deposits`             | GET/POST  | Yes    | List/create deposits                               |
| `/api/withdrawals`          | GET/POST  | Yes    | List/create withdrawals                            |
| `/api/trades`               | GET       | Yes    | List user's trades                                 |
| `/api/trades/[id]`          | PATCH     | Yes    | MARK_DELIVERED, CONFIRM, DISPUTE                   |
| `/api/verifications`        | GET/POST  | Yes    | List/create verifications                          |
| `/api/upload`               | POST      | Yes    | Multipart file upload                              |
| `/api/admin/stats`          | GET       | Admin  | Dashboard stats                                    |
| `/api/admin/verifications`  | GET/PATCH | Admin  | Manage verifications                               |
| `/api/admin/disputes`       | GET/PATCH | Admin  | Resolve trade disputes                             |
| `/api/webhooks/mercadopago` | POST      | No     | MercadoPago IPN webhook                            |

**Automated API check:**

```bash
node tools/healthcheck.mjs --api-only
```

### Layer 3: Authentication Flow

1. **Registration**: POST `/api/auth/register` → creates user + wallet
2. **Login**: NextAuth credentials provider → bcrypt compare → JWT token
3. **Session**: JWT stored in cookie → `getServerSession` on server side
4. **Admin**: `isAdmin` flag on User model → checked in admin routes

**Common issues:**

- `NEXTAUTH_SECRET` not set → sessions won't persist
- `NEXTAUTH_URL` wrong → CSRF/redirect issues
- bcrypt hash mismatch → double-check password encoding
- Cookie not sent → check `withCredentials` / cookie domain

### Layer 4: Trading Engine

```
BUY ORDER created
  → check buyer has enough balanceBRL
  → freeze BRL (balanceBRL → frozenBRL)
  → try matchBuyOrder() — find cheapest sell orders
    → create Trade (PENDING_DELIVERY)
    → move buyer BRL from frozenBRL → escrowBRL
    → update order filledAmount

SELLER marks DELIVERED → 48h countdown starts
BUYER confirms → escrowBRL released to seller's balanceBRL (minus 2% fee)
BUYER disputes → admin resolves (release to seller OR refund buyer)
Auto-release after 48h if buyer doesn't act
```

**Common issues:**

- Balance not enough → wallet.balanceBRL < order total
- Seller needs verification → check approved verifications for currency
- Order not matching → check price overlap between buy/sell
- Escrow stuck → check trade status (PENDING_DELIVERY vs DELIVERED)

### Layer 5: Financial Flow

```
DEPOSIT:  User → MercadoPago PIX → webhook → credit wallet
WITHDRAW: User → request → admin processes → PIX payout
```

**Common issues:**

- `MERCADOPAGO_ACCESS_TOKEN` not set → deposits created without payment URL
- Webhook not reachable → deposits stay PENDING
- Balance mismatch → check frozenBRL + escrowBRL accounting

### Layer 6: UI Components

| Page         | Key Elements                            | Data Source                                        |
| ------------ | --------------------------------------- | -------------------------------------------------- |
| Homepage     | Game grid, price chart, stats           | `/api/games`, `/api/prices`                        |
| Trade        | Order form, order book tables           | `/api/games`, `/api/orders`                        |
| Wallet       | Balance display, deposit/withdraw forms | `/api/wallet`, `/api/deposits`, `/api/withdrawals` |
| Verification | Upload form, status list                | `/api/games`, `/api/verifications`, `/api/upload`  |
| History      | Trade cards with action buttons         | `/api/trades`, `/api/trades/[id]`                  |
| Admin        | Stats, verification list, dispute list  | `/api/admin/*`                                     |

## Tool Usage Quick Reference

```bash
# Quick debug — screenshot + diagnostics for any page
node tools/debug.mjs /                        # Homepage
node tools/debug.mjs /login                   # Login page
node tools/debug.mjs /carteira --auth         # Wallet (logged in)
node tools/debug.mjs /negociar --auth --console --network

# Full screenshot capture
node tools/screenshot.mjs                     # All pages
node tools/screenshot.mjs --page /login       # Single page
node tools/screenshot.mjs --mobile            # Mobile viewport
node tools/screenshot.mjs --all-viewports     # Desktop + tablet + mobile

# UI interaction testing
node tools/interact.mjs                       # All flows
node tools/interact.mjs --flow register       # Just registration
node tools/interact.mjs --flow login
node tools/interact.mjs --flow order
node tools/interact.mjs --flow wallet
node tools/interact.mjs --flow homepage

# Health check
node tools/healthcheck.mjs                    # Full check
node tools/healthcheck.mjs --api-only
node tools/healthcheck.mjs --ui-only

# Visual regression
node tools/visual-diff.mjs --baseline         # Save current state
# ... make changes ...
node tools/visual-diff.mjs --compare          # Compare
```

## Common Troubleshooting Scenarios

### "Page shows blank / loading forever"

1. `node tools/debug.mjs /path --console` → check JS errors
2. `node tools/debug.mjs /path --network` → check failed API calls
3. `node tools/healthcheck.mjs --api-only` → verify APIs work

### "Login doesn't work"

1. `node tools/interact.mjs --flow login` → see step-by-step screenshots
2. Check `.env` has `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
3. Check user exists: `node tools/debug.mjs / --eval "fetch('/api/auth/session').then(r=>r.json())"`

### "Orders not matching"

1. Check both buy/sell orders exist with overlapping prices
2. Verify buyer has balance, seller has verified funds
3. Check order statuses: OPEN, PARTIALLY_FILLED

### "Wallet shows wrong balance"

1. `node tools/debug.mjs /carteira --auth --network` → check API responses
2. Verify deposit status (PENDING vs APPROVED)
3. Check escrow/frozen amounts add up

### "Admin panel not accessible"

1. Check user has `isAdmin: true` in database
2. Run `npx prisma studio` to inspect User table
3. `node tools/debug.mjs /admin --auth --console`
