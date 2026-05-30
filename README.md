# Soufra — AI-Powered Meal Planner

Soufra is a full-stack meal planning application built around Moroccan and Mediterranean cuisines. It uses GPT-4o-mini to generate personalized weekly meal plans, estimates grocery costs using a real Moroccan pricing engine, and adapts over time based on the user's feedback and taste profile.

Built as part of a Master's thesis project.

---

## Overview

The core loop is simple: a user completes a brief onboarding flow, Soufra generates a full 7-day × 3-meal plan calibrated to their calorie target and cuisine preferences, and then produces a priced grocery list based on their city and preferred shopping tier (souk, supermarket, or premium). From there, users can swap individual meals with AI or database alternatives, track leftovers across the week, export the grocery list for shopping, and receive a weekly nutrition summary by email. Behind the scenes, a receipt-OCR pipeline ingests real purchase data to keep the price estimates honest (see Receipt OCR Price-Learning Pipeline).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Authentication | NextAuth v5 (credentials + JWT) |
| AI | OpenAI GPT-4o-mini (text + vision) |
| Email | Resend |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Client state | Zustand (onboarding store) |
| Deployment | Vercel (with cron jobs) |

---

## Features

### Authentication
- Email/password registration and login
- Password reset flow with tokenized email link (1-hour expiry)
- All authenticated routes protected server-side via NextAuth session

### Onboarding
Five-step flow with Framer Motion directional slide transitions:
1. Personal info (age, weight, height, biological sex) — used to compute BMR/TDEE via Mifflin-St Jeor
2. Fitness goal and activity level
3. Cuisine preferences (Moroccan, Mediterranean, Healthy, Middle Eastern, Italian)
4. Dietary restrictions and allergies
5. Weekly budget and market tier — with a live budget feasibility assessment

Profile data is validated server-side before any Prisma write. Invalid or missing numeric fields return a 400 rather than silently writing NaN to the database.

### AI Meal Plan Generation
- Two-stage pipeline: a lightweight GPT-4o-mini "week strategy" call first plans cuisine distribution, meal anchors, and leftover pairings, then a second call generates all 21 meals (7 days × breakfast / lunch / dinner) against that strategy
- Validation + self-repair loop: every generated plan is checked for hard constraints (full slot coverage, calorie bounds, macro↔calorie consistency, no duplicate slots/names) and soft variety targets; a plan that fails is sent back to the model for up to 2 repair passes before it is accepted
- Calorie split: 25% breakfast / 40% lunch / 35% dinner (adjustable in Ramadan mode)
- Prompt includes the user's calorie target, cuisine mix, allergies, fitness goal, weekly budget, and a live budget-feasibility assessment
- Adaptive learning: after 3+ recipe ratings, the prompt is enriched with liked/disliked cuisines, preferred difficulty, preferred recipe styles, and average cook-time preference
- Cross-plan variety: the last 3 plans are summarized and appended to the prompt to avoid repetition
- Requires all 21 slots to be valid before committing anything to the database (atomic transaction)
- Each meal includes a `whyChosen` field explaining in one sentence why it was selected for that user

### Single-Slot AI Swap
- Any individual meal card has a swap button
- Fetches up to 4 database alternatives from the user's own recipe history first
- Always shows an AI "Generate a fresh meal" button that calls GPT-4o-mini for a single new recipe calibrated to the correct calorie target for that meal type

### Leftover Tracking
- Dinner cards show a toggle button to mark the meal as having leftovers
- Atomically marks the next day's lunch slot as `usesLeftovers`
- Grocery list generation skips `usesLeftovers` slots to avoid double-counting ingredients
- Visual badges on both the dinner card ("Leftovers packed") and the linked lunch card ("Using yesterday's leftovers")

### Ramadan Mode
Toggle in Settings that restructures the entire meal plan:
- Suhoor (pre-dawn, 30% of daily calories) replaces Breakfast
- Iftar (break-fast at Maghrib, 50%) replaces Lunch
- Post-Iftar (light evening meal, 20%) replaces Dinner
- The AI prompt is updated with detailed Ramadan food guidance (harira, chebakia, dates, sellou, msemen, etc.)
- Dashboard relabels the three meal columns accordingly
- A crescent moon badge appears in the dashboard header

### Moroccan Pricing Engine
Grocery cost estimates are derived from a curated catalog of Moroccan ingredient prices, not generic data:
- Prices vary by city (Casablanca, Rabat, Marrakech, Tangier, Fes, Agadir) and market tier
- Three tiers: `souk` (lowest realistic local market prices), `supermarket`, `premium`
- Budget feasibility is assessed on every grocery generation: `on_track`, `tight`, `unrealistic` (or `unknown` when body metrics are missing)
- Confidence score per item based on price source quality
- User's city and tier are set during onboarding and editable in Settings

### Receipt OCR Price-Learning Pipeline
> Data-ingestion / research pipeline — not a shipped end-user button in the current build. The backend endpoint (`POST /api/receipts/upload`) feeds real receipt data into the system to improve price estimates and to build the ground truth for the price-accuracy evaluation (see Testing & Evaluation).
- A receipt image is sent as base64 to GPT-4o-mini Vision, which parses item names (translating Arabic/French to English), quantities, prices, and the printed purchase date
- Parsed items are saved to the `Receipt` / `ReceiptItem` tables and structured `ReceiptLinePrice` rows
- Each recognized item is matched against the `Ingredient` catalog using the shared 6-step matcher (manual → exact alias → exact slug/name → prefix → fuzzy Dice → category fallback); only confident matches are kept, so weak matches never pollute the price data
- Matched items generate `PriceSnapshot` and `PricePoint` entries, improving future grocery estimates and serving as held-out ground truth for the accuracy evaluation

### Grocery List
- Auto-generated from the active meal plan's ingredients
- Items grouped by category (Meat & Protein, Vegetables, Fruits, Dairy, Grains, Pantry & Spices, Other)
- Each item shows estimated price in MAD, quantity, and confidence level
- Interactive checklist with optimistic UI updates — checked state persists to the database
- Budget tracker bar with remaining or over-budget status
- "Clear checked" bulk action
- Exportable as a branded PDF via `window.print()`

### Recipe Detail and Cook Mode
- Full recipe page with ingredients, instructions, nutrition breakdown, and difficulty
- Cook Mode: step-by-step instruction walkthrough with progress indicator
- Like/dislike feedback buttons that feed back into the adaptive learning system

### History and Nutrition Trends
- Full history of all generated meal plans with expand/collapse per plan
- Per-plan stats: total meals, average daily calories, average protein
- Meal type tabs (Breakfast / Lunch / Dinner) with a 7-day grid view per tab
- Nutrition trend chart across plans (calories, protein, carbs, fats over time)
- Staggered Framer Motion entrance animation on history cards

### Weekly Email Report
Sent automatically every Monday at 07:00 UTC via Vercel Cron to all users with an active meal plan:
- Average daily calories vs personal target
- Most planned cuisine that week
- Most recently liked recipe
- Grocery spend vs weekly budget
- Personalized nutrition tip based on fitness goal
- Link back to the app

### PDF Export
Two print-quality layouts triggered by `window.print()`:
- **Grocery list PDF**: branded banner, stats row, budget progress bar, 2-column category grid with checkboxes and prices
- **Meal plan PDF**: branded banner, 7-day × 3-meal grid with calories and prep time per cell, today's column highlighted

### Favorites
- Like any recipe from its detail page or from the swap modal
- Favorites page shows all liked recipes with nutrition stats
- Disliked recipes are excluded from future AI-generated plans

### Progressive Web App
- `manifest.json` with standalone display, theme color, and app icons
- Cache-first service worker (`/sw.js`) — caches the app shell and static assets, falls back to cache on network failure, never caches API routes
- Registered via inline script in the root layout
- `apple-touch-icon` and mobile web app meta tags for iOS home screen installation

---

## Project Structure

```
soufra/
├── app/
│   ├── api/
│   │   ├── auth/           # NextAuth handler, forgot-password, reset-password
│   │   ├── cron/           # Vercel Cron: weekly email report + nightly price sync
│   │   ├── feedback/       # Recipe like/dislike
│   │   ├── grocery/        # Generate list, check/uncheck items
│   │   ├── meal-plans/     # Generate, generate-single, swap slot, alternatives
│   │   ├── onboarding/     # Save onboarding profile
│   │   ├── receipts/       # OCR upload and price learning
│   │   ├── register/       # Account creation
│   │   └── settings/       # Save profile settings
│   ├── dashboard/          # Main meal plan view and recipe detail
│   ├── favorites/          # Liked recipes
│   ├── grocery/            # Grocery list page
│   ├── history/            # Past meal plans and trend chart
│   ├── onboarding/         # 5-step onboarding flow
│   ├── recipes/            # Browse all recipes
│   ├── settings/           # User settings
│   └── layout.tsx          # Root layout (fonts, providers, PWA service-worker registration)
├── components/             # All shared UI components
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── budget-utils.ts     # Client-safe budget feasibility functions (no Prisma)
│   ├── email.ts            # Resend email templates
│   ├── nutrition.ts        # BMR/TDEE calculation (Mifflin-St Jeor)
│   ├── onboarding-store.ts # Zustand store for onboarding state
│   ├── pricing.ts          # Server-side Moroccan pricing engine (catalog match + cost estimation)
│   ├── pricing/            # Pricing v2: DB resolver, ingredient matcher, scrapers, normalization
│   ├── cuisines.ts         # Supported cuisine list + sanitization
│   └── prisma.ts           # Prisma client singleton
├── prisma/
│   └── schema.prisma       # Full database schema
├── scripts/                # Evaluation + maintenance scripts (price accuracy, baseline accuracy, etc.)
├── tests/                  # DB-free unit tests for the pricing pipeline
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker
│   └── logo.png            # App icon
└── vercel.json             # Cron job schedule
```

---

## Database Schema

| Model | Purpose |
|---|---|
| `User` | Account, profile, calorie target, preferences, Ramadan mode |
| `Recipe` | Ingredients, instructions, macros, tags — one record per AI generation |
| `MealPlan` | A weekly plan (active or historical) |
| `MealPlanSlot` | One meal within a plan (day + meal type + recipe + leftover flags) |
| `GroceryList` | A priced shopping list linked to a meal plan |
| `GroceryItem` | Individual item with price, category, confidence, and checked state |
| `RecipeFeedback` | Like/dislike per user per recipe |
| `Ingredient` | Canonical ingredient catalog with aliases |
| `PricePoint` | Individual price observations (curated, scraped, or receipt) |
| `IngredientPriceSnapshot` | Computed reference price per ingredient × city × tier |
| `PriceSnapshot` | Timestamped per-ingredient price observation from any source (scrape, receipt, baseline) |
| `BaselineIngredientPrice` | DB-backed fallback price per ingredient × tier × city (replaces the JSON-only baseline) |
| `SourceCatalogProduct` / `ProductIngredientMatch` | Scraped store products and their links to internal ingredients (6-step matcher output) |
| `Receipt` | Ingested receipt metadata (store, total, purchase date) |
| `ReceiptItem` | Parsed line items from a receipt, linked to Ingredient |
| `ReceiptLinePrice` | Structured receipt line with quantity + unit price — held-out ground truth for the price-accuracy evaluation |
| `CronLog` | Audit trail for nightly cron runs (job, duration, success, counters, warnings) |
| `PriceResolutionLog` | Audit trail explaining why a specific price was chosen for each grocery item |

---

## API Reference

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/register` | Create a new account |
| `POST` | `/api/onboarding` | Save onboarding profile |
| `POST` | `/api/settings` | Update profile settings |
| `POST` | `/api/meal-plans/generate` | Generate a full 21-meal plan |
| `POST` | `/api/meal-plans/generate-single` | AI-generate one replacement meal for a slot |
| `PATCH` | `/api/meal-plans/slots` | Swap recipe or toggle leftover flag on a slot |
| `GET` | `/api/meal-plans/alternatives` | Fetch DB recipe alternatives for a slot |
| `POST` | `/api/grocery/generate` | Generate a priced grocery list from the active plan |
| `PATCH` | `/api/grocery/items` | Check or uncheck a grocery item |
| `POST` | `/api/receipts/upload` | OCR a receipt image and learn prices |
| `POST` | `/api/feedback` | Like or dislike a recipe |
| `GET` | `/api/cron/weekly-report` | Send weekly email report (Vercel Cron, Monday 07:00 UTC) |
| `POST` | `/api/auth/forgot-password` | Send password reset email |
| `POST` | `/api/auth/reset-password` | Validate token and update password |

---

## Environment Variables

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."      # Pooled connection (used at runtime)
DIRECT_URL="postgresql://..."        # Direct connection (used for migrations)

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://your-domain.vercel.app"

# OpenAI
OPENAI_API_KEY="sk-..."

# Resend (email)
RESEND_API_KEY="re_..."

# Vercel Cron (protects the weekly report endpoint in production)
CRON_SECRET="your-cron-secret"
```

---

## Local Development

```bash
# Install dependencies
npm install

# Push the schema to your database and generate the Prisma client
npx prisma db push

# (Optional) Seed the ingredient price catalog
npm run seed:prices

# Start the development server
npm run dev
```

> **Note on Windows and Supabase TLS:** Supabase requires SSL for all connections. On some Windows environments, Prisma may fail locally with a TLS negotiation error. This does not affect production on Vercel (Linux). As a workaround, try using the Supabase direct connection URL for `DATABASE_URL` during local development.

---

## Testing & Evaluation

### Unit tests
Pricing-pipeline logic is covered by DB-free unit tests (no database, no API key, no network):

```bash
npm test
```

They cover quantity / unit parsing (including the `cl` centilitre case and French decimal-comma quantities like `"1,5 kg"`), unit conversions (`g → kg`, `g → bunch`, `pc → dozen`, `slice → loaf`, plus a deliberate `pc → kg` refusal), end-to-end ingredient cost estimation, the 6-step ingredient matcher, and grocery-list grouping — including a regression guard against merging distinct ingredients such as **bell pepper** (a vegetable) with **black pepper** (a spice).

### Price-accuracy evaluation
`scripts/evaluate-price-accuracy.ts` compares the resolver's predicted unit prices against the real prices on ingested receipts, **excluding receipt-sourced snapshots to avoid circular validation**. It reports MAE, MAPE, RMSE, signed bias, within-±10 / ±20 / ±30 % accuracy, and per-category / per-confidence-level / per-prediction-source breakdowns suitable for a thesis results section:

```bash
npx tsx scripts/evaluate-price-accuracy.ts
```

The receipts that feed this evaluation are ingested via `POST /api/receipts/upload` (see the Receipt OCR pipeline above), not collected through an in-app button.

---

## Deployment

The app deploys to Vercel. The build command runs `prisma generate` before `next build` to ensure the Prisma client is always up to date:

```json
"build": "prisma generate && next build"
```

Two Vercel Cron jobs are configured in `vercel.json`:
- `/api/cron/weekly-report` — every Monday at 07:00 UTC, sends the weekly email digest
- `/api/cron/price-sync` — every day at 03:00 UTC, scrapes Aswak Assalam store prices and writes `PriceSnapshot` rows; results are logged to `CronLog` for reliability reporting

Both endpoints require a `Bearer` token matching `CRON_SECRET` in production.

---

## Key Design Decisions

**Server/client module separation.** `lib/pricing.ts` imports Prisma and is server-only. Budget feasibility logic used inside client components (onboarding, settings) lives in `lib/budget-utils.ts` as pure functions with no Prisma dependency. This prevents the "cannot use server-only module in a client component" error at build time.

**Atomic meal plan generation.** Deactivating the previous plan, creating the new plan record, creating all 21 recipes, and creating all 21 slots happen inside a single Prisma `$transaction` with a 30-second timeout. If anything fails, nothing is written to the database.

**Receipt OCR as a price-learning pipeline.** Receipt images are parsed by GPT-4o-mini Vision into structured `PriceSnapshot` / `ReceiptLinePrice` rows rather than just a list shown back to the user. This real purchase data improves future grocery estimates for everyone in the same city and market tier, and provides the held-out ground truth for the price-accuracy evaluation. In the current build it runs as a data-ingestion pipeline (the in-app upload button is disabled), keeping the shipped UI honest about what users can actually do themselves.

**Leftover tracking is grocery-aware.** When a dinner slot is marked as having leftovers, the system atomically links the next day's lunch slot (`usesLeftovers: true`). The grocery generation loop skips those slots entirely to avoid purchasing duplicate ingredients.

**Ramadan mode is prompt-level, not schema-level.** The three meal types (`breakfast`, `lunch`, `dinner`) remain unchanged in the database. Ramadan mode adjusts the calorie split, enriches the AI prompt with Ramadan-specific food guidance, and relabels the UI — without any schema divergence or data migration.

**i18n without URL routing.** Rather than restructuring every route under `/en/` and `/fr/` prefixes, language preference is stored in a cookie and applied via a React context at the root layout. This keeps the routing simple while still persisting the user's preference across sessions.

---

## Color Palette

| Name | Hex | Usage |
|---|---|---|
| Teal | `#2D5F5D` | Primary brand, sidebar, buttons |
| Gold | `#D4A574` | Accents, active nav states, highlights |
| Orange | `#E67E22` | Calories, swap actions, CTAs |
| Green | `#27AE60` | Success states, budget OK indicators |
| Warm White | `#FDFAF6` | App background |
| Charcoal | `#2C3E50` | Body text and headings |
