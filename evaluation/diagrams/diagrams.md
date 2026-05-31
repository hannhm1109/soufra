# Soufra — Thesis Diagrams

> **How to preview in VS Code:**
> Open this file → `Ctrl+Shift+P` → `Markdown: Open Preview to the Side`
> All 4 diagrams render in the preview panel.
>
> **To export as PNG/SVG:** Right-click on a diagram in preview → Save Image
> Or use the Mermaid extension's export button.

---

## 1. Architecture Système

```mermaid
flowchart TB
    classDef user     fill:#2C3E50,stroke:#2C3E50,color:#fff,rx:8
    classDef vercel   fill:#F0F7F7,stroke:#2D5F5D,color:#2C3E50,rx:8
    classDef api      fill:#FEF3E8,stroke:#E67E22,color:#2C3E50,rx:8
    classDef external fill:#EEF2FF,stroke:#6366F1,color:#2C3E50,rx:8
    classDef db       fill:#F0FFF4,stroke:#27AE60,color:#2C3E50,rx:8
    classDef cron     fill:#F0F7F7,stroke:#2D5F5D,color:#2C3E50,rx:8

    Browser["🌐 Navigateur Web\nReact + Framer Motion"]:::user
    PWA["📱 App Mobile (PWA)\nmanifest.json + sw.js"]:::user

    subgraph Vercel["☁️  Vercel — Hosting & Déploiement"]
        direction TB

        subgraph NextJS["Next.js 16 (App Router)"]
            direction LR
            Pages["📄 Pages SSR/RSC\n/dashboard\n/grocery\n/favorites\n/history"]:::vercel

            subgraph APIRoutes["API Routes (Serverless Functions)"]
                direction TB
                R1["POST /api/meal-plans/generate\n2-stage GPT pipeline + validation"]:::api
                R2["POST /api/grocery/generate\nPricing engine 4 niveaux"]:::api
                R3["POST /api/meal-plans/generate-single\nSwap 1 repas avec repair loop"]:::api
                R4["POST /api/receipts/upload\nOCR pipeline GPT-4o-mini Vision"]:::api
                R5["GET  /api/cron/price-sync\nNightly 03:00 UTC"]:::api
                R6["GET  /api/cron/weekly-report\nMonday 07:00 UTC"]:::api
            end

            Prisma["🗄️  Prisma ORM\nType-safe client\nschema.prisma → migrations"]:::vercel
        end

        CronScheduler["⏰ Vercel Cron\nScheduler"]:::cron
    end

    subgraph External["Services Externes"]
        direction LR
        GPT["🤖 OpenAI GPT-4o-mini\nGénération repas + OCR recettes"]:::external
        Resend["✉️  Resend\nEmails transactionnels\nrapport hebdomadaire"]:::external
        Aswak["🛒 Aswak Assalam\nScraping HTML + JSON-LD\nnightly"]:::external
        Unsplash["🖼️  Unsplash API\nImages des recettes"]:::external
    end

    subgraph DB["Supabase — PostgreSQL"]
        direction LR
        DB1[("👤 User · MealPlan\nMealPlanSlot · Recipe\nRecipeFeedback")]:::db
        DB2[("🛒 GroceryList\nGroceryItem")]:::db
        DB3[("💰 Ingredient · PriceSnapshot\nBaselinePrice · ReceiptLine\nSourceCatalogProduct")]:::db
        DB4[("📋 CronLog\nPriceResolutionLog")]:::db
    end

    Browser -- "HTTPS" --> Pages
    Browser -- "fetch()" --> APIRoutes
    PWA -- "HTTPS" --> Pages
    Pages -- "Server Actions / fetch" --> APIRoutes

    APIRoutes -- "JSON mode\n~12k tokens" --> GPT
    APIRoutes -- "sendEmail()" --> Resend
    APIRoutes -- "getRecipeImage()" --> Unsplash
    CronScheduler -- "triggers" --> R5
    CronScheduler -- "triggers" --> R6
    R5 -- "fetchPage()" --> Aswak

    Prisma --> DB1
    Prisma --> DB2
    Prisma --> DB3
    Prisma --> DB4
    APIRoutes -- "queries" --> Prisma
```

---

## 2. Diagramme de Séquence — Génération du Plan Repas

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant API as Next.js API
    participant GPT as GPT-4o-mini
    participant DB as Prisma / DB
    participant UI as Front-end

    User->>+API: POST /api/meal-plans/generate

    API->>+DB: findUnique(user) + feedback.findMany(last 100)
    DB-->>-API: user profile, feedbackPatterns, previousRecipeNames

    Note over API: buildAdaptiveSection() — liked/disliked cuisines, preferred difficulty<br/>buildBudgetSection() — budget feasibility assessment<br/>buildVarietySection() — cuisine targets, avoid list

    API->>+GPT: Appel 1 — Stratégie semaine<br/>(~900 tokens, temperature=0.35)
    GPT-->>-API: { cuisineTargets, breakfastAnchors,<br/>lunchAnchors, leftoverPairs, budgetMoves }

    Note over API: buildMealPlanPrompt() + buildStrategySection()

    API->>+GPT: Appel 2 — 21 repas complets<br/>(~12 000 tokens, temperature=0.55)
    GPT-->>-API: { meals: [ ...21 recettes JSON... ] }

    Note over API: normalizeMeal() × 21<br/>syncLeftoverFlags() — link dinner→next lunch<br/>reconcileNutrition() — rescale macros to match calorie target<br/>validateMeals() → { critical[], soft[] }

    loop Si critical.length > 0 — max 2 tentatives
        API->>+GPT: Appel repair — corriger les erreurs listées<br/>(temperature=0.2)
        GPT-->>-API: { meals: [ ...corrigées... ] }
        Note over API: re-validate après chaque repair
    end

    API->>+DB: $transaction(30s timeout)<br/>MealPlan.create + 21×Recipe.create + 21×MealPlanSlot.create
    Note over DB: Atomique — tout ou rien
    DB-->>-API: { planId, created: 21 }

    API->>DB: user.update({ learnedPrefs })

    API-->>-UI: JSON { success, planId, adapted: true, insights }
    UI-->>User: router.refresh() → affiche le nouveau plan
```

---

## 3. Diagramme Entité-Relation (simplifié)

```mermaid
erDiagram
    USER {
        String id PK
        String email
        String password
        Int calorieTarget
        Float weeklyBudget
        Enum marketTier "souk|supermarket|premium"
        StringArray cuisines
        StringArray allergies
        Boolean isRamadan
        Json learnedPrefs
        DateTime createdAt
    }

    MEAL_PLAN {
        String id PK
        String userId FK
        DateTime weekStart
        Boolean isActive
        Float totalCost
    }

    MEAL_PLAN_SLOT {
        String id PK
        String mealPlanId FK
        String recipeId FK
        Int dayOfWeek "0-6"
        String mealType "breakfast|lunch|dinner"
        Boolean hasLeftovers
        Boolean usesLeftovers
        String whyChosen
    }

    RECIPE {
        String id PK
        String name
        String cuisine
        Int prepTime
        Int cookTime
        Int calories
        Float protein
        Float carbs
        Float fats
        Json ingredients
        Json instructions
        StringArray tags
        String imageUrl
    }

    GROCERY_LIST {
        String id PK
        String userId FK
        Float totalCost
        Enum marketTier
        String budgetStatus "on_track|tight|unrealistic"
        Float priceConfidence
        DateTime weekOf
    }

    GROCERY_ITEM {
        String id PK
        String groceryListId FK
        String ingredientId FK
        String name
        String quantity
        Float price
        Enum priceSource "curated|scrape|receipt"
        Float priceConfidence
        Boolean checked
    }

    INGREDIENT {
        String id PK
        String slug
        String name
        String category
        String defaultUnit "kg|l|dozen|bunch|pot..."
        Boolean isActive
    }

    INGREDIENT_ALIAS {
        String id PK
        String ingredientId FK
        String alias
    }

    PRICE_SNAPSHOT {
        String id PK
        String ingredientId FK
        Enum source "aswak_shop|receipt|baseline"
        Decimal packagePrice
        Float packageQuantityValue
        String packageQuantityUnit
        Decimal unitPrice
        String unitBaseUnit
        Enum confidenceLevel "high|medium|low"
        DateTime capturedAt
        DateTime expiresAt
    }

    BASELINE_INGREDIENT_PRICE {
        String id PK
        String ingredientId FK
        Enum marketTier
        Decimal unitPrice
        String unit
        String city
    }

    RECIPE_FEEDBACK {
        String id PK
        String userId FK
        String recipeId FK
        Boolean liked
        DateTime createdAt
    }

    CRON_LOG {
        String id PK
        String job
        Boolean success
        Int snapshotsCreated
        Int errors
        DateTime startedAt
        DateTime finishedAt
        Int durationMs
    }

    PRICE_RESOLUTION_LOG {
        String id PK
        String groceryListId FK
        String ingredientId FK
        Enum resolutionMethod "exact_snapshot|baseline|category_fallback"
        Enum confidenceLevel
        String explanation
        DateTime createdAt
    }

    USER ||--o{ MEAL_PLAN : "génère"
    USER ||--o{ GROCERY_LIST : "possède"
    USER ||--o{ RECIPE_FEEDBACK : "donne"
    MEAL_PLAN ||--o{ MEAL_PLAN_SLOT : "contient 21"
    MEAL_PLAN_SLOT }o--|| RECIPE : "référence"
    RECIPE ||--o{ RECIPE_FEEDBACK : "reçoit"
    GROCERY_LIST ||--o{ GROCERY_ITEM : "contient"
    GROCERY_ITEM }o--o| INGREDIENT : "identifié comme"
    INGREDIENT ||--o{ INGREDIENT_ALIAS : "a"
    INGREDIENT ||--o{ PRICE_SNAPSHOT : "a"
    INGREDIENT ||--o{ BASELINE_INGREDIENT_PRICE : "a"
    GROCERY_LIST ||--o{ PRICE_RESOLUTION_LOG : "audité dans"
```

---

## 4. Pipeline de Résolution des Prix (4 niveaux)

```mermaid
flowchart TD
    classDef input    fill:#2C3E50,stroke:#2C3E50,color:#fff,rx:8
    classDef level1   fill:#F0F7F7,stroke:#2D5F5D,color:#2C3E50,rx:6
    classDef level2   fill:#FDF6ED,stroke:#D4A574,color:#2C3E50,rx:6
    classDef level3   fill:#FEF3E8,stroke:#E67E22,color:#2C3E50,rx:6
    classDef level4   fill:#EEF2FF,stroke:#6366F1,color:#2C3E50,rx:6
    classDef decision fill:#FFFBEB,stroke:#F59E0B,color:#2C3E50
    classDef resolved fill:#F0FFF4,stroke:#27AE60,color:#2C3E50,rx:8
    classDef output   fill:#2D5F5D,stroke:#2D5F5D,color:#fff,rx:8

    START(["resolvePriceBatch(ingredients, tier, city)"]):::input

    START --> L1_QUERY

    subgraph N1["Niveau 1 — PriceSnapshot — Scrape Aswak Assalam"]
        L1_QUERY["PriceSnapshot.findMany\ningredientId + capturedAt ≥ now-30j + isPromo=false"]:::level1
        L1_SELECT["selectBestSnapshot(rows, city, tier, defaultUnit)\n→ pour chaque snapshot: selectSnapshotUnitPrice()\n→ retourne le snapshot au prix minimum plausible"]:::level1
        L1_CHECK{"Prix plausible\ntrouvé ?"}:::decision
    end

    subgraph UNIT_LOGIC["selectSnapshotUnitPrice — logique interne"]
        direction LR
        U1["Si rawBaseUnit ≠ defaultUnit\n→ ignorer unitPrice stocké\n(ex: 0.02 MAD/g pour le riz)"]:::level1
        U2["Dériver depuis package:\npackagePrice ÷ convertToBaseUnits(qty, unit, defaultUnit)"]:::level1
        U3["Plausibility gates:\nfloor(kg)=2, ceiling=500 MAD/unit"]:::level1
        U4["Si stored ÷ derived > 3×\n→ préférer derived"]:::level1
        U1 --> U2 --> U3 --> U4
    end

    L1_QUERY --> L1_SELECT
    L1_SELECT -.->|"détail"| UNIT_LOGIC
    L1_SELECT --> L1_CHECK

    L1_CHECK -->|"OUI"| R1(["RESOLU — Source: aswak_shop\nconfidenceLevel: high si < 7j"]):::resolved
    L1_CHECK -->|"NON"| L2_QUERY

    subgraph N2["Niveau 2 — IngredientPriceSnapshot — Moyennes calculées"]
        L2_QUERY["IngredientPriceSnapshot.findMany\ntier + city → legBest"]:::level2
        L2_CHECK{"referencePriceMad > 0 ?"}:::decision
    end

    L2_QUERY --> L2_CHECK
    L2_CHECK -->|"OUI"| R2(["RESOLU — Source: aggregate\nconfidenceLevel: medium"]):::resolved
    L2_CHECK -->|"NON"| L3_QUERY

    subgraph N3["Niveau 3 — BaselineIngredientPrice — DB seedée depuis JSON"]
        L3_QUERY["BaselineIngredientPrice.findFirst\ningredientId + marketTier + city"]:::level3
        L3_CHECK{"Baseline\ntrouvé ?"}:::decision
    end

    L3_QUERY --> L3_CHECK
    L3_CHECK -->|"OUI"| R3(["RESOLU — Source: baseline\nconfidenceLevel: low"]):::resolved
    L3_CHECK -->|"NON"| L4_QUERY

    subgraph N4["Niveau 4 — Catalogue JSON curé (moroccan-ingredient-prices.json)"]
        L4_QUERY["findCatalogEntry(ingredientText, catalog)\nfindGenericFallback() si pas de match"]:::level4
        L4_CONVERT["convertIngredientQuantity(parsed, entry)\nestimatedCost = unitsNeeded × referencePriceMad × tierMultiplier"]:::level4
    end

    L4_QUERY --> L4_CONVERT
    L4_CONVERT --> R4(["RESOLU — Source: curated JSON\nconfidenceLevel: low"]):::resolved

    R1 & R2 & R3 & R4 --> OUTPUT

    OUTPUT(["ResolvedPrice\n{ unitPrice · source · resolutionMethod · confidenceLevel · explanation }"]):::output
```

---

## Comment exporter ces diagrammes

Pour intégrer dans ton rapport Word/LaTeX :

1. **Dans VS Code** : Ouvre ce fichier → `Ctrl+Shift+P` → `Markdown: Open Preview to the Side`
2. **Clic droit sur le diagramme** dans le preview → `Copy Image` ou `Save Image As`
3. Colle directement dans Word

Ou utilise [mermaid.live](https://mermaid.live) — colle le code Mermaid, télécharge en PNG/SVG haute résolution.
