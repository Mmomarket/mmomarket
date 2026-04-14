# MMOMarket Troubleshooting Tools

A comprehensive set of Playwright-based tools for screenshot capture, UI interaction testing, and automated troubleshooting of the MMOMarket website.

## Prerequisites

```bash
npm install --save-dev playwright @playwright/test
npx playwright install chromium
```

## Tools

### 1. `screenshot.mjs` — Full-Page Screenshot Capture

Captures screenshots of every page in every state (logged out, logged in, admin).

```bash
node tools/screenshot.mjs                     # All pages
node tools/screenshot.mjs --page /login       # Single page
node tools/screenshot.mjs --auth              # Only authenticated pages
node tools/screenshot.mjs --mobile            # Mobile viewport
```

### 2. `interact.mjs` — UI Interaction Testing

Performs user flows (register, login, create order, etc.) and captures screenshots at each step.

```bash
node tools/interact.mjs                       # Run all flows
node tools/interact.mjs --flow register       # Single flow
node tools/interact.mjs --flow login
node tools/interact.mjs --flow order
node tools/interact.mjs --flow wallet
node tools/interact.mjs --flow trade
node tools/interact.mjs --flow admin
```

### 3. `healthcheck.mjs` — API & UI Health Check

Tests all API endpoints and page loads, generating a health report.

```bash
node tools/healthcheck.mjs                    # Full health check
node tools/healthcheck.mjs --api-only         # Only API checks
node tools/healthcheck.mjs --ui-only          # Only UI checks
```

### 4. `visual-diff.mjs` — Visual Regression Tool

Captures baseline screenshots and compares against current state.

```bash
node tools/visual-diff.mjs --baseline         # Capture baselines
node tools/visual-diff.mjs --compare          # Compare current vs baseline
```

## Output

All screenshots and reports are saved to `tools/output/`:

```
tools/output/
  screenshots/          # Full-page screenshots
  interactions/         # Step-by-step interaction screenshots
  healthcheck/          # Health check reports (JSON + HTML)
  visual-diff/          # Baseline and comparison images
```

## Troubleshooting Strategy

### Layer 1: Infrastructure

- Database connectivity (SQLite file exists, migrations applied)
- Environment variables (.env complete)
- Next.js build & dev server starts

### Layer 2: API Endpoints

- All GET endpoints return 200
- Auth flow (register → login → session)
- Protected routes return 401 when unauthenticated
- Data integrity (games seeded, wallets created)

### Layer 3: UI Rendering

- All pages load without JS errors
- Components render correctly
- Forms are interactive
- Navigation works

### Layer 4: User Flows

- Registration → Login → Trade flow
- Wallet deposit/withdraw flow
- Seller verification flow
- Admin panel flow
- Order matching engine
