# Soufra — AI-Powered Meal Planner

Soufra is a full-stack meal planning application built around Moroccan and Mediterranean cuisines. It uses GPT-4o-mini to generate personalized weekly meal plans, estimates grocery costs using a real Moroccan pricing engine, and adapts over time based on the user's feedback and taste profile.

Built as part of a Master's thesis project.

---

## Overview

The core loop is simple: a user completes a brief onboarding flow, Soufra generates a full 7-day × 3-meal plan calibrated to their calorie target and cuisine preferences, and then produces a priced grocery list based on their city and preferred shopping tier (souk, supermarket, or premium). From there, users can swap individual meals with AI or database alternatives, track leftovers, scan receipts to improve price accuracy over time, and receive a weekly nutrition summary by email.

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
3. Cuisine preferences (Moroccan, Mediterranean, Healthy, French, Middle Eastern)
4. Dietary restrictions and allergies
5. Weekly budget and market tier — with a live budget feasibility assessment

Profile data is validated server-side before any Prisma write. Invalid or missing numeric fields return a 400 rather than silently writing NaN to the database.

### AI Meal Plan Generation
- Generates exactly 21 meals (7 days × breakfast / lunch / dinner) in a single GPT-4o-mini call
- Calorie split: 25% breakfast / 40% lunch / 35% dinner (adjustable in Ramadan mode)
- Prompt includes the user's calorie target, cuisine mix, allergies, fitness goal, and weekly budget
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
- Budget feasibility is assessed on every grocery generation: `realistic`, `tight`, or `unrealistic`
- Confidence score per item based on price source quality
- User's city and tier are set during onboarding and editable in Settings

### Receipt OCR and Price Learning
- "Scan Receipt" button on the grocery page opens the camera on mobile or a file picker on desktop
- Image is sent as base64 to GPT-4o-mini Vision, which parses item names (translating Arabic/French to English), quantities, and prices
- Parsed items are saved to the `Receipt` and `ReceiptItem` tables
- Each recognized item is matched against the `Ingredient` catalog by name and alias
- Matched items generate new `PricePoint` entries, improving future grocery estimates over time

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

### Internationalization
- English and French supported across navigation, section titles, action buttons, and status messages
- Language selection persisted in a `lang` cookie (1-year expiry)
- `LangProvider` context wraps the entire app at the root layout level, so language state is shared across all pages
- EN / FR pill switcher in the sidebar

---

## Project Structure

```
soufra/
├── app/
│   ├── api/
│   │   ├── auth/           # NextAuth handler, forgot-password, reset-password
│   │   ├── cron/           # Weekly email report (Vercel Cron)
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
│   └── layout.tsx          # Root layout (fonts, LangProvider, SW registration)
├── components/             # All shared UI components
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── budget-utils.ts     # Client-safe budget feasibility functions (no Prisma)
│   ├── email.ts            # Resend email templates
│   ├── nutrition.ts        # BMR/TDEE calculation (Mifflin-St Jeor)
│   ├── onboarding-store.ts # Zustand store for onboarding state
│   ├── pricing.ts          # Server-side Moroccan pricing engine
│   ├── prisma.ts           # Prisma client singleton
│   └── translations.ts     # EN/FR translation objects
├── prisma/
│   └── schema.prisma       # Full database schema
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
| `PricePoint` | Individual price observations (curated, scraped, or from receipts) |
| `IngredientPriceSnapshot` | Computed reference price per ingredient per city and tier |
| `Receipt` | Scanned receipt metadata |
| `ReceiptItem` | Parsed line items from a receipt, linked to Ingredient |

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

## Deployment

The app deploys to Vercel. The build command runs `prisma generate` before `next build` to ensure the Prisma client is always up to date:

```json
"build": "prisma generate && next build"
```

The weekly email report runs as a Vercel Cron job every Monday at 07:00 UTC, configured in `vercel.json`. The endpoint requires a `Bearer` token matching `CRON_SECRET` in production.

---

## Key Design Decisions

**Server/client module separation.** `lib/pricing.ts` imports Prisma and is server-only. Budget feasibility logic used inside client components (onboarding, settings) lives in `lib/budget-utils.ts` as pure functions with no Prisma dependency. This prevents the "cannot use server-only module in a client component" error at build time.

**Atomic meal plan generation.** Deactivating the previous plan, creating the new plan record, creating all 21 recipes, and creating all 21 slots happen inside a single Prisma `$transaction` with a 30-second timeout. If anything fails, nothing is written to the database.

**Receipt OCR as a price learning system.** Scanned receipts do not just display a list to the user — they create `PricePoint` database entries that improve the accuracy of future grocery estimates for every user in the same city and market tier.

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
