"""
Soufra — Thesis Diagrams Generator
====================================
Generates 4 thesis-quality architecture diagrams as PNG files.

Usage:
    python scripts/generate-diagrams.py

Output:
    evaluation/diagrams/01-architecture.png
    evaluation/diagrams/02-sequence-meal-generation.png
    evaluation/diagrams/03-er-diagram.png
    evaluation/diagrams/04-pricing-pipeline.png
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe
import numpy as np

os.makedirs("evaluation/diagrams", exist_ok=True)

# ── Soufra palette ────────────────────────────────────────────────────────────
TEAL       = "#2D5F5D"
TEAL_LIGHT = "#F0F7F7"
GOLD       = "#D4A574"
GOLD_LIGHT = "#FDF6ED"
ORANGE     = "#E67E22"
ORANGE_LT  = "#FEF3E8"
GREEN      = "#27AE60"
GREEN_LT   = "#F0FFF4"
RED        = "#E74C3C"
RED_LT     = "#FFF5F5"
PURPLE     = "#6366F1"
PURPLE_LT  = "#EEF2FF"
CHARCOAL   = "#2C3E50"
GREY       = "#9CA3AF"
WARM_WHITE = "#FDFAF6"
WHITE      = "#FFFFFF"

def box(ax, x, y, w, h, label, sublabel=None,
        facecolor=WHITE, edgecolor=TEAL, fontsize=10,
        bold=False, radius=0.04, labelcolor=CHARCOAL):
    rect = FancyBboxPatch((x - w/2, y - h/2), w, h,
                          boxstyle=f"round,pad=0,rounding_size={radius}",
                          linewidth=1.5, edgecolor=edgecolor, facecolor=facecolor,
                          zorder=3)
    ax.add_patch(rect)
    fw = "bold" if bold else "normal"
    if sublabel:
        ax.text(x, y + h*0.12, label, ha="center", va="center",
                fontsize=fontsize, fontweight=fw, color=labelcolor, zorder=4)
        ax.text(x, y - h*0.22, sublabel, ha="center", va="center",
                fontsize=fontsize - 1.5, color=GREY, zorder=4, style="italic")
    else:
        ax.text(x, y, label, ha="center", va="center",
                fontsize=fontsize, fontweight=fw, color=labelcolor, zorder=4)

def arrow(ax, x1, y1, x2, y2, label="", color=TEAL, lw=1.5,
          arrowstyle="-|>", fontsize=8):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=arrowstyle, color=color,
                                lw=lw, connectionstyle="arc3,rad=0.0"),
                zorder=5)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx+0.01, my+0.015, label, fontsize=fontsize, color=color,
                ha="center", va="bottom", zorder=6,
                bbox=dict(boxstyle="round,pad=0.15", facecolor=WARM_WHITE,
                          edgecolor="none", alpha=0.85))

def section_box(ax, x, y, w, h, label, color, alpha=0.08):
    rect = FancyBboxPatch((x, y), w, h,
                          boxstyle="round,pad=0,rounding_size=0.05",
                          linewidth=1.2, linestyle="--",
                          edgecolor=color, facecolor=color, alpha=alpha, zorder=1)
    ax.add_patch(rect)
    ax.text(x + 0.015, y + h - 0.03, label, fontsize=8, color=color,
            fontweight="bold", va="top", zorder=2)

# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 1 — SYSTEM ARCHITECTURE
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(14, 9), facecolor=WARM_WHITE)
ax.set_facecolor(WARM_WHITE)
ax.set_xlim(0, 14); ax.set_ylim(0, 9)
ax.axis("off")

fig.suptitle("Soufra — Architecture Système", fontsize=16,
             fontweight="bold", color=CHARCOAL, y=0.97)

# ── Layer 0: User ──────────────────────────────────────────────────────────
section_box(ax, 0.3, 7.8, 13.4, 0.8, "Utilisateur", CHARCOAL)
box(ax, 4.5, 8.2, 3.2, 0.5, "Navigateur Web", "React + Framer Motion",
    facecolor=CHARCOAL, edgecolor=CHARCOAL, labelcolor=WHITE, bold=True, fontsize=9)
box(ax, 9.0, 8.2, 2.8, 0.5, "App Mobile (PWA)", "manifest.json + sw.js",
    facecolor=CHARCOAL, edgecolor=CHARCOAL, labelcolor=WHITE, fontsize=9)

# ── Layer 1: Vercel ────────────────────────────────────────────────────────
section_box(ax, 0.3, 4.2, 13.4, 3.4, "Vercel (Hosting & Déploiement)", TEAL)

# Next.js pages
box(ax, 2.2, 6.6, 3.2, 0.7, "Pages (SSR / RSC)", "/dashboard  /grocery\n/favorites  /history",
    facecolor=TEAL_LIGHT, edgecolor=TEAL, fontsize=8.5)

# API routes block
section_box(ax, 4.8, 4.35, 5.8, 2.7, "API Routes (Serverless Functions)", ORANGE, alpha=0.06)
box(ax, 6.2, 6.55, 2.0, 0.55, "/meal-plans/generate", "2-stage GPT pipeline",
    facecolor=ORANGE_LT, edgecolor=ORANGE, fontsize=8)
box(ax, 8.5, 6.55, 1.8, 0.55, "/grocery/generate", "Pricing engine",
    facecolor=ORANGE_LT, edgecolor=ORANGE, fontsize=8)
box(ax, 6.2, 5.75, 2.0, 0.55, "/meal-plans/generate-single", "Swap 1 repas",
    facecolor=ORANGE_LT, edgecolor=ORANGE, fontsize=8)
box(ax, 8.5, 5.75, 1.8, 0.55, "/receipts/upload", "OCR pipeline",
    facecolor=ORANGE_LT, edgecolor=ORANGE, fontsize=8)
box(ax, 6.2, 4.95, 2.0, 0.55, "/cron/price-sync", "Nightly 03:00 UTC",
    facecolor=ORANGE_LT, edgecolor=ORANGE, fontsize=8)
box(ax, 8.5, 4.95, 1.8, 0.55, "/cron/weekly-report", "Monday 07:00 UTC",
    facecolor=ORANGE_LT, edgecolor=ORANGE, fontsize=8)

# Prisma
box(ax, 2.2, 5.1, 3.2, 0.85, "Prisma ORM", "Type-safe DB client\nschema.prisma",
    facecolor=TEAL_LIGHT, edgecolor=TEAL, fontsize=8.5)

# Cron
box(ax, 12.0, 5.75, 1.8, 0.9, "Vercel Cron\nScheduler", None,
    facecolor=TEAL_LIGHT, edgecolor=TEAL, fontsize=8.5)

# ── Layer 2: External Services ─────────────────────────────────────────────
section_box(ax, 0.3, 2.4, 13.4, 1.6, "Services Externes", PURPLE)
box(ax, 2.2,  3.2, 2.8, 0.7, "OpenAI GPT-4o-mini", "Génération repas + OCR",
    facecolor=PURPLE_LT, edgecolor=PURPLE, fontsize=8.5)
box(ax, 5.5,  3.2, 2.8, 0.7, "Resend", "Emails transactionnels",
    facecolor=PURPLE_LT, edgecolor=PURPLE, fontsize=8.5)
box(ax, 8.8,  3.2, 2.8, 0.7, "Aswak Assalam", "Scraping nightly\n(HTML + JSON-LD)",
    facecolor=PURPLE_LT, edgecolor=PURPLE, fontsize=8.5)
box(ax, 12.0, 3.2, 1.8, 0.7, "Unsplash", "Images recettes",
    facecolor=PURPLE_LT, edgecolor=PURPLE, fontsize=8.5)

# ── Layer 3: Database ──────────────────────────────────────────────────────
section_box(ax, 0.3, 0.3, 13.4, 1.9, "Supabase — PostgreSQL", GREEN)
box(ax, 2.0,  1.25, 2.0, 0.85, "User / Auth\nMealPlan / Recipe", None,
    facecolor=GREEN_LT, edgecolor=GREEN, fontsize=8)
box(ax, 4.3,  1.25, 2.0, 0.85, "GroceryList\nGroceryItem", None,
    facecolor=GREEN_LT, edgecolor=GREEN, fontsize=8)
box(ax, 6.6,  1.25, 2.2, 0.85, "Ingredient\nPriceSnapshot", None,
    facecolor=GREEN_LT, edgecolor=GREEN, fontsize=8)
box(ax, 9.1,  1.25, 2.2, 0.85, "BaselinePrice\nReceiptLine", None,
    facecolor=GREEN_LT, edgecolor=GREEN, fontsize=8)
box(ax, 11.6, 1.25, 1.8, 0.85, "CronLog\nResolutionLog", None,
    facecolor=GREEN_LT, edgecolor=GREEN, fontsize=8)

# ── Arrows ─────────────────────────────────────────────────────────────────
# User → Pages
arrow(ax, 4.5, 7.95, 2.2, 6.95, "HTTPS", CHARCOAL)
# User → API (browser calls API directly too)
arrow(ax, 5.5, 7.95, 6.2, 6.82, "", CHARCOAL)
# Pages → API
arrow(ax, 3.8, 6.6, 4.9, 6.6, "fetch()", ORANGE, lw=1.2)
# API → OpenAI
arrow(ax, 6.5, 4.35, 2.2, 3.55, "JSON mode", PURPLE, lw=1.2)
# API → Resend
arrow(ax, 7.5, 4.35, 5.5, 3.55, "", PURPLE, lw=1.2)
# Cron → Aswak
arrow(ax, 11.0, 5.75, 8.8, 3.55, "fetch HTML", PURPLE, lw=1.2)
# Prisma → DB
arrow(ax, 2.2, 4.67, 2.0, 2.17, "", GREEN, lw=1.5)
# API → Prisma
arrow(ax, 5.5, 5.25, 3.8, 5.25, "", TEAL, lw=1.2)

plt.tight_layout(rect=[0, 0, 1, 0.96])
out = "evaluation/diagrams/01-architecture.png"
fig.savefig(out, dpi=180, bbox_inches="tight", facecolor=WARM_WHITE)
print(f"[OK] {out}")
plt.close(fig)


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 2 — SEQUENCE: MEAL PLAN GENERATION
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(15, 11), facecolor=WARM_WHITE)
ax.set_facecolor(WARM_WHITE)
ax.set_xlim(0, 15); ax.set_ylim(0, 11)
ax.axis("off")

fig.suptitle("Soufra — Diagramme de Séquence : Génération du Plan Repas",
             fontsize=15, fontweight="bold", color=CHARCOAL, y=0.98)

# Swim-lane headers
actors = [
    ("Utilisateur",   1.3,  CHARCOAL, WHITE),
    ("Next.js API",   4.2,  TEAL,     WHITE),
    ("GPT-4o-mini",   7.5,  ORANGE,   WHITE),
    ("Prisma / DB",   11.0, GREEN,    WHITE),
    ("Front-end",     13.8, PURPLE,   WHITE),
]
for label, x, fc, tc in actors:
    rect = FancyBboxPatch((x - 0.85, 9.8), 1.7, 0.75,
                          boxstyle="round,pad=0,rounding_size=0.05",
                          facecolor=fc, edgecolor=fc, linewidth=0, zorder=3)
    ax.add_patch(rect)
    ax.text(x, 10.175, label, ha="center", va="center",
            fontsize=9, fontweight="bold", color=tc, zorder=4)
    # Life line
    ax.plot([x, x], [0.3, 9.8], color=GREY, linewidth=0.8,
            linestyle="--", alpha=0.5, zorder=1)

def seq_arrow(ax, x1, x2, y, label, color=CHARCOAL, dashed=False, fontsize=8.5):
    ls = "--" if dashed else "-"
    style = "-|>" if x2 > x1 else "<|-"
    ax.annotate("", xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle=style, color=color, lw=1.4,
                                linestyle=ls),
                zorder=5)
    mx = (x1 + x2) / 2
    dy = 0.09
    ax.text(mx, y + dy, label, ha="center", va="bottom",
            fontsize=fontsize, color=color, zorder=6,
            bbox=dict(boxstyle="round,pad=0.15", facecolor=WARM_WHITE,
                      edgecolor="none", alpha=0.9))

def seq_box(ax, x, y, w, h, label, fc, ec, fontsize=8):
    rect = FancyBboxPatch((x - w/2, y - h/2), w, h,
                          boxstyle="round,pad=0,rounding_size=0.03",
                          facecolor=fc, edgecolor=ec, linewidth=1.2, zorder=3)
    ax.add_patch(rect)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=fontsize, color=CHARCOAL, zorder=4)

def note(ax, x, y, text, color=GOLD):
    ax.text(x, y, text, ha="left", va="center", fontsize=7.8,
            color=color, style="italic", zorder=6,
            bbox=dict(boxstyle="round,pad=0.2", facecolor=GOLD_LIGHT,
                      edgecolor=GOLD, linewidth=0.8, alpha=0.9))

# Y positions (top to bottom)
y_vals = [9.35, 8.75, 8.15, 7.5, 6.85, 6.15, 5.5, 4.8, 4.1, 3.4, 2.7, 2.0, 1.35, 0.65]

# Step 1: User clicks "Generate"
seq_arrow(ax, 1.3, 4.2, y_vals[0], "POST /api/meal-plans/generate")
note(ax, 4.5, y_vals[0]+0.02, "← Clic bouton « Générer »")

# Step 2: Fetch user profile + feedback
seq_arrow(ax, 4.2, 11.0, y_vals[1], "findUnique(user) + feedback.findMany()")
seq_arrow(ax, 11.0, 4.2, y_vals[1]-0.35, "user, feedbackPatterns, previousNames", dashed=True, color=GREEN)
note(ax, 11.2, y_vals[1], "← Derniers 100 avis")

# Step 3: Build strategy prompt
seq_box(ax, 4.2, y_vals[2]-0.05, 2.8, 0.45,
        "buildAdaptiveSection()\nbuildBudgetSection()\nbuildVarietySection()",
        TEAL_LIGHT, TEAL, fontsize=7.5)

# Step 4: GPT call 1 - strategy
seq_arrow(ax, 4.2, 7.5, y_vals[3], "Appel 1 — Stratégie semaine (~900 tokens)", ORANGE)
seq_arrow(ax, 7.5, 4.2, y_vals[3]-0.38, "{cuisineTargets, anchors, leftoverPairs}", dashed=True, color=ORANGE)
note(ax, 7.7, y_vals[3]+0.02, "← Petit appel, temperature=0.35")

# Step 5: Build main prompt
seq_box(ax, 4.2, y_vals[4]-0.05, 2.8, 0.45,
        "buildMealPlanPrompt()\n+ buildStrategySection()",
        TEAL_LIGHT, TEAL, fontsize=7.5)

# Step 6: GPT call 2 - 21 meals
seq_arrow(ax, 4.2, 7.5, y_vals[5], "Appel 2 — 21 repas complets (~12 000 tokens)", ORANGE)
seq_arrow(ax, 7.5, 4.2, y_vals[5]-0.38, "{meals: [...21 recettes JSON...]}", dashed=True, color=ORANGE)
note(ax, 7.7, y_vals[5]+0.02, "← temperature=0.55")

# Step 7: Validation
seq_box(ax, 4.2, y_vals[6]-0.05, 3.0, 0.6,
        "validateMeals() → {critical[], soft[]}\nreconcileNutrition() × 21\nsyncLeftoverFlags()",
        TEAL_LIGHT, TEAL, fontsize=7.5)

# Step 8: Repair loop (conditional)
section_box(ax, 0.1, y_vals[7]-0.5, 14.8, 1.0, "Si critical.length > 0  (max 2 tentatives)", RED, alpha=0.04)
seq_arrow(ax, 4.2, 7.5, y_vals[7], "Appel repair — corriger les erreurs", RED)
seq_arrow(ax, 7.5, 4.2, y_vals[7]-0.38, "{meals: [...corrigées...]}", dashed=True, color=RED)

# Step 9: DB transaction
seq_arrow(ax, 4.2, 11.0, y_vals[8], "$transaction — MealPlan + 21×Recipe + 21×MealPlanSlot", GREEN)
seq_arrow(ax, 11.0, 4.2, y_vals[8]-0.38, "planId, created=21", dashed=True, color=GREEN)
note(ax, 11.2, y_vals[8]+0.02, "← Atomique: tout ou rien")

# Step 10: Update learned prefs
seq_arrow(ax, 4.2, 11.0, y_vals[9], "user.update({learnedPrefs})", GREEN)

# Step 11: Response
seq_arrow(ax, 4.2, 13.8, y_vals[10],
          "JSON {success, planId, adapted, insights}", PURPLE)

# Step 12: Router refresh
seq_arrow(ax, 13.8, 1.3, y_vals[11],
          "router.refresh() → affiche le plan", PURPLE, dashed=True)

# Labels on left
step_labels = [
    (y_vals[0],  "1. Request"),
    (y_vals[1],  "2. DB fetch"),
    (y_vals[2]-0.05, "3. Build prompt"),
    (y_vals[3],  "4. GPT strategie"),
    (y_vals[4]-0.05, "5. Build prompt 2"),
    (y_vals[5],  "6. GPT 21 repas"),
    (y_vals[6]-0.05, "7. Validation"),
    (y_vals[7],  "8. Repair (si erreur)"),
    (y_vals[8],  "9. Commit DB"),
    (y_vals[9],  "10. Prefs"),
    (y_vals[10], "11. Response"),
    (y_vals[11], "12. UI refresh"),
]
for y, lbl in step_labels:
    ax.text(0.08, y, lbl, fontsize=7.2, color=GREY, va="center", ha="left")

plt.tight_layout(rect=[0, 0, 1, 0.97])
out = "evaluation/diagrams/02-sequence-meal-generation.png"
fig.savefig(out, dpi=180, bbox_inches="tight", facecolor=WARM_WHITE)
print(f"[OK] {out}")
plt.close(fig)


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 3 — ER DIAGRAM (simplified)
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(16, 10), facecolor=WARM_WHITE)
ax.set_facecolor(WARM_WHITE)
ax.set_xlim(0, 16); ax.set_ylim(0, 10)
ax.axis("off")

fig.suptitle("Soufra — Diagramme Entité-Relation (simplifié)",
             fontsize=15, fontweight="bold", color=CHARCOAL, y=0.98)

def er_box(ax, x, y, title, fields, w=2.6, fc=TEAL_LIGHT, ec=TEAL):
    h = 0.38 + len(fields) * 0.3
    # Header
    rect_h = FancyBboxPatch((x - w/2, y - 0.25), w, 0.42,
                            boxstyle="round,pad=0,rounding_size=0.03",
                            facecolor=ec, edgecolor=ec, zorder=3)
    ax.add_patch(rect_h)
    ax.text(x, y - 0.04, title, ha="center", va="center",
            fontsize=9, fontweight="bold", color=WHITE, zorder=4)
    # Body
    rect_b = FancyBboxPatch((x - w/2, y - 0.25 - len(fields)*0.3), w, len(fields)*0.3,
                            boxstyle="round,pad=0,rounding_size=0.03",
                            facecolor=fc, edgecolor=ec, linewidth=1.2, zorder=2)
    ax.add_patch(rect_b)
    for i, (fname, ftype, pk) in enumerate(fields):
        fy = y - 0.42 - i*0.3
        prefix = "PK " if pk == "pk" else ("FK " if pk == "fk" else "   ")
        ax.text(x - w/2 + 0.12, fy, f"{prefix}{fname}", fontsize=7.5,
                va="center", color=CHARCOAL, zorder=4)
        ax.text(x + w/2 - 0.1, fy, ftype, fontsize=7,
                va="center", ha="right", color=GREY, zorder=4)

def er_arrow(ax, x1, y1, x2, y2, label1="1", label2="N", color=GREY):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-", color=color, lw=1.3),
                zorder=5)
    mx, my = (x1+x2)/2, (y1+y2)/2
    dx, dy = x2-x1, y2-y1
    nx, ny = -dy, dx
    norm = (nx**2+ny**2)**0.5 or 1
    ox, oy = 0.12*nx/norm, 0.12*ny/norm
    ax.text(x1 + (x2-x1)*0.15 + ox, y1 + (y2-y1)*0.15 + oy,
            label1, fontsize=8, color=ORANGE, fontweight="bold", ha="center")
    ax.text(x1 + (x2-x1)*0.85 + ox, y1 + (y2-y1)*0.85 + oy,
            label2, fontsize=8, color=ORANGE, fontweight="bold", ha="center")

# ── User ────────────────────────────────────────────────────────────────────
er_box(ax, 2.0, 9.3, "USER", [
    ("id",           "String (CUID)", "pk"),
    ("email",        "String unique", ""),
    ("password",     "String?", ""),
    ("calorieTarget","Int?", ""),
    ("weeklyBudget", "Float?", ""),
    ("marketTier",   "souk|super|premium", ""),
    ("cuisines",     "String[]", ""),
    ("allergies",    "String[]", ""),
    ("isRamadan",    "Boolean", ""),
    ("learnedPrefs", "Json?", ""),
], w=3.0, ec=CHARCOAL, fc="#F8F9FA")

# ── MealPlan ─────────────────────────────────────────────────────────────────
er_box(ax, 6.5, 9.3, "MEAL_PLAN", [
    ("id",          "String (CUID)", "pk"),
    ("userId",      "String", "fk"),
    ("weekStart",   "DateTime", ""),
    ("isActive",    "Boolean", ""),
    ("totalCost",   "Float?", ""),
], w=2.8, ec=TEAL)

# ── MealPlanSlot ─────────────────────────────────────────────────────────────
er_box(ax, 10.5, 9.2, "MEAL_PLAN_SLOT", [
    ("id",             "String", "pk"),
    ("mealPlanId",     "String", "fk"),
    ("recipeId",       "String", "fk"),
    ("dayOfWeek",      "Int (0–6)", ""),
    ("mealType",       "breakfast|lunch|dinner", ""),
    ("hasLeftovers",   "Boolean", ""),
    ("usesLeftovers",  "Boolean", ""),
    ("whyChosen",      "String?", ""),
], w=3.0, ec=TEAL)

# ── Recipe ────────────────────────────────────────────────────────────────────
er_box(ax, 14.0, 9.0, "RECIPE", [
    ("id",          "String", "pk"),
    ("name",        "String", ""),
    ("cuisine",     "String", ""),
    ("calories",    "Int", ""),
    ("protein",     "Float", ""),
    ("carbs",       "Float", ""),
    ("fats",        "Float", ""),
    ("ingredients", "Json", ""),
    ("instructions","Json", ""),
    ("tags",        "String[]", ""),
], w=2.6, ec=ORANGE, fc=ORANGE_LT)

# ── GroceryList ───────────────────────────────────────────────────────────────
er_box(ax, 2.0, 5.4, "GROCERY_LIST", [
    ("id",             "String", "pk"),
    ("userId",         "String", "fk"),
    ("totalCost",      "Float?", ""),
    ("marketTier",     "Enum", ""),
    ("budgetStatus",   "on_track|tight|...", ""),
    ("priceConfidence","Float?", ""),
], w=3.0, ec=TEAL)

# ── GroceryItem ───────────────────────────────────────────────────────────────
er_box(ax, 6.5, 5.4, "GROCERY_ITEM", [
    ("id",             "String", "pk"),
    ("groceryListId",  "String", "fk"),
    ("ingredientId",   "String?", "fk"),
    ("name",           "String", ""),
    ("quantity",       "String", ""),
    ("price",          "Float?", ""),
    ("priceSource",    "curated|scrape|receipt", ""),
    ("priceConfidence","Float?", ""),
    ("checked",        "Boolean", ""),
], w=3.0, ec=TEAL)

# ── Ingredient ────────────────────────────────────────────────────────────────
er_box(ax, 10.5, 5.2, "INGREDIENT", [
    ("id",          "String", "pk"),
    ("slug",        "String unique", ""),
    ("name",        "String", ""),
    ("category",    "String", ""),
    ("defaultUnit", "kg|l|dozen|...", ""),
], w=2.8, ec=GREEN, fc=GREEN_LT)

# ── PriceSnapshot ─────────────────────────────────────────────────────────────
er_box(ax, 14.0, 5.2, "PRICE_SNAPSHOT", [
    ("id",                 "String", "pk"),
    ("ingredientId",       "String?", "fk"),
    ("source",             "aswak_shop|receipt|...", ""),
    ("packagePrice",       "Decimal", ""),
    ("packageQuantityValue","Float?", ""),
    ("packageQuantityUnit","String?", ""),
    ("unitPrice",          "Decimal?", ""),
    ("capturedAt",         "DateTime", ""),
    ("confidenceLevel",    "high|medium|low", ""),
], w=2.8, ec=GREEN, fc=GREEN_LT)

# ── Audit tables ──────────────────────────────────────────────────────────────
er_box(ax, 4.0, 1.5, "CRON_LOG", [
    ("id",              "String", "pk"),
    ("job",             "String", ""),
    ("success",         "Boolean", ""),
    ("snapshotsCreated","Int", ""),
    ("errors",          "Int", ""),
    ("startedAt",       "DateTime", ""),
], w=2.8, ec=PURPLE, fc=PURPLE_LT)

er_box(ax, 8.5, 1.5, "PRICE_RESOLUTION_LOG", [
    ("id",             "String", "pk"),
    ("groceryListId",  "String?", "fk"),
    ("ingredientId",   "String?", "fk"),
    ("resolutionMethod","exact|baseline|...", ""),
    ("confidenceLevel","high|medium|low", ""),
    ("explanation",    "String", ""),
], w=3.2, ec=PURPLE, fc=PURPLE_LT)

er_box(ax, 12.5, 1.5, "RECIPE_FEEDBACK", [
    ("id",       "String", "pk"),
    ("userId",   "String", "fk"),
    ("recipeId", "String", "fk"),
    ("liked",    "Boolean", ""),
], w=2.8, ec=RED, fc=RED_LT)

# Relationships
er_arrow(ax, 3.5, 8.6,  5.1, 8.7,  "1", "N")  # User → MealPlan
er_arrow(ax, 7.9, 8.7,  9.0, 8.9,  "1", "N")  # MealPlan → Slot
er_arrow(ax, 12.0, 8.9, 12.7, 8.7, "N", "1")  # Slot → Recipe
er_arrow(ax, 3.5, 7.0,  3.5, 6.2,  "1", "N")  # User → GroceryList
er_arrow(ax, 5.0, 5.4,  5.0, 5.4+0.1, "1", "N")  # GroceryList → GroceryItem
er_arrow(ax, 5.0, 5.0,  5.0, 4.9,  "1", "N")
ax.annotate("", xy=(5.0, 4.85), xytext=(5.0, 5.05),
            arrowprops=dict(arrowstyle="-", color=GREY, lw=1.3))
# GroceryList → GroceryItem
er_arrow(ax, 5.0, 5.7,  6.0, 5.0+0.7, "1", "N")
# GroceryItem → Ingredient
er_arrow(ax, 8.0, 4.8,  9.1, 4.8,  "N", "1")
# Ingredient → PriceSnapshot
er_arrow(ax, 11.9, 4.8, 12.6, 4.8, "1", "N")
# GroceryList → ResolutionLog
er_arrow(ax, 4.5, 4.05, 7.0, 2.3,  "1", "N")

# Legend
legend_items = [
    (CHARCOAL, "User / Auth"), (TEAL, "Repas & Courses"),
    (ORANGE, "Recettes"), (GREEN, "Ingrédients & Prix"),
    (PURPLE, "Audit"), (RED, "Feedback")
]
for i, (color, label) in enumerate(legend_items):
    x_l = 0.3 + (i % 3) * 3.5
    y_l = 0.55 if i < 3 else 0.25
    rect = FancyBboxPatch((x_l, y_l), 0.3, 0.18,
                          boxstyle="round,pad=0", facecolor=color, zorder=3)
    ax.add_patch(rect)
    ax.text(x_l + 0.38, y_l + 0.09, label, fontsize=8,
            va="center", color=CHARCOAL)

plt.tight_layout(rect=[0, 0, 1, 0.97])
out = "evaluation/diagrams/03-er-diagram.png"
fig.savefig(out, dpi=180, bbox_inches="tight", facecolor=WARM_WHITE)
print(f"[OK] {out}")
plt.close(fig)


# ══════════════════════════════════════════════════════════════════════════════
# DIAGRAM 4 — PRICING PIPELINE (4-tier resolution)
# ══════════════════════════════════════════════════════════════════════════════
fig, ax = plt.subplots(figsize=(13, 13), facecolor=WARM_WHITE)
ax.set_facecolor(WARM_WHITE)
ax.set_xlim(0, 13); ax.set_ylim(0, 13)
ax.axis("off")

fig.suptitle("Soufra — Pipeline de Résolution des Prix (4 niveaux)",
             fontsize=15, fontweight="bold", color=CHARCOAL, y=0.98)

def p_box(ax, x, y, w, h, label, sublabel=None,
          fc=WHITE, ec=TEAL, bold=True, fs=10):
    rect = FancyBboxPatch((x - w/2, y - h/2), w, h,
                          boxstyle="round,pad=0,rounding_size=0.06",
                          linewidth=2, edgecolor=ec, facecolor=fc, zorder=3)
    ax.add_patch(rect)
    fw = "bold" if bold else "normal"
    if sublabel:
        ax.text(x, y + h*0.15, label, ha="center", va="center",
                fontsize=fs, fontweight=fw, color=CHARCOAL, zorder=4)
        ax.text(x, y - h*0.22, sublabel, ha="center", va="center",
                fontsize=fs-1.5, color=GREY, style="italic", zorder=4)
    else:
        ax.text(x, y, label, ha="center", va="center",
                fontsize=fs, fontweight=fw, color=CHARCOAL, zorder=4)

def p_arrow(ax, x1, y1, x2, y2, label="", color=CHARCOAL, lw=2.0):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=color, lw=lw),
                zorder=5)
    if label:
        mx, my = (x1+x2)/2 + 0.05, (y1+y2)/2
        ax.text(mx, my, label, ha="left", va="center", fontsize=8.5,
                color=color, zorder=6,
                bbox=dict(boxstyle="round,pad=0.2", facecolor=WARM_WHITE,
                          edgecolor="none", alpha=0.9))

def diamond(ax, x, y, w, h, label, fc=GOLD_LIGHT, ec=GOLD):
    pts = np.array([[x, y+h/2], [x+w/2, y], [x, y-h/2], [x-w/2, y]])
    patch = plt.Polygon(pts, closed=True, facecolor=fc,
                        edgecolor=ec, linewidth=2, zorder=3)
    ax.add_patch(patch)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=8.5, fontweight="bold", color=CHARCOAL, zorder=4)

# ── Input ────────────────────────────────────────────────────────────────────
p_box(ax, 6.5, 12.2, 5.0, 0.75,
      "Ingredient ID + Market Tier + City",
      "resolvePriceBatch(ingredients, tier, city)",
      fc=CHARCOAL, ec=CHARCOAL, fs=9)
ax.text(6.5, 12.2, "Ingredient ID + Market Tier + City",
        ha="center", va="center", fontsize=10, fontweight="bold",
        color=WHITE, zorder=5)
ax.text(6.5, 11.88, "resolvePriceBatch(ingredients, tier, city)",
        ha="center", va="center", fontsize=8, color=GREY, style="italic", zorder=5)

# ── Level 1: PriceSnapshot ───────────────────────────────────────────────────
p_arrow(ax, 6.5, 11.82, 6.5, 11.2, "", CHARCOAL)

section_box(ax, 0.5, 9.0, 12.0, 2.1,
            "Niveau 1 — PriceSnapshot (scrape Aswak, max 30 jours)", TEAL, alpha=0.05)

p_box(ax, 6.5, 10.6, 6.5, 0.7,
      "PriceSnapshot.findMany(ingredientId, capturedAt ≥ cutoff, isPromo=false)",
      None, fc=TEAL_LIGHT, ec=TEAL, bold=False, fs=8.5)

diamond(ax, 6.5, 9.85, 4.5, 0.6, "selectBestSnapshot() → plausible price ?")

# Yes branch → Level 1 result
p_arrow(ax, 8.75, 9.85, 10.5, 9.85, "OUI", GREEN, lw=1.8)
p_box(ax, 11.5, 9.85, 1.8, 0.6, "✓ RÉSOLU\nSource: aswak",
      None, fc=GREEN_LT, ec=GREEN, fs=8)

# selectBestSnapshot detail
section_box(ax, 0.6, 9.1, 5.0, 0.55,
            "selectBestSnapshot: min(plausible unit prices)", TEAL, alpha=0.03)
ax.text(3.1, 9.35,
        "① Filtre par tier + city  ② selectSnapshotUnitPrice() × chaque snapshot\n"
        "③ Plausibility gates (floor/ceiling)  ④ Retourne le prix minimum",
        fontsize=7, color=TEAL, ha="center", va="center")

# ── Level 2 ───────────────────────────────────────────────────────────────────
p_arrow(ax, 6.5, 9.55, 6.5, 8.9, "NON", RED, lw=1.8)
ax.text(6.65, 9.2, "NON", fontsize=8.5, color=RED, fontweight="bold")

section_box(ax, 0.5, 7.15, 12.0, 1.65,
            "Niveau 2 — IngredientPriceSnapshot (moyennes calculées)", GOLD, alpha=0.05)

p_box(ax, 6.5, 8.3, 7.0, 0.55,
      "IngredientPriceSnapshot.findMany(tier, city) → legBest",
      None, fc=GOLD_LIGHT, ec=GOLD, bold=False, fs=8.5)

diamond(ax, 6.5, 7.65, 4.0, 0.55, "referencePriceMad > 0 ?")

p_arrow(ax, 8.5, 7.65, 10.5, 7.65, "OUI", GREEN, lw=1.8)
p_box(ax, 11.5, 7.65, 1.8, 0.6, "✓ RÉSOLU\nSource: aggregate",
      None, fc=GREEN_LT, ec=GREEN, fs=8)

# ── Level 3 ───────────────────────────────────────────────────────────────────
p_arrow(ax, 6.5, 7.37, 6.5, 6.75, "NON", RED, lw=1.8)
ax.text(6.65, 7.05, "NON", fontsize=8.5, color=RED, fontweight="bold")

section_box(ax, 0.5, 5.0, 12.0, 1.65,
            "Niveau 3 — BaselineIngredientPrice (DB seedée depuis JSON)", ORANGE, alpha=0.05)

p_box(ax, 6.5, 6.15, 7.5, 0.55,
      "BaselineIngredientPrice.findFirst(ingredientId, marketTier, city)",
      None, fc=ORANGE_LT, ec=ORANGE, bold=False, fs=8.5)

diamond(ax, 6.5, 5.5, 3.5, 0.55, "baseline trouvé ?")

p_arrow(ax, 8.25, 5.5, 10.5, 5.5, "OUI", GREEN, lw=1.8)
p_box(ax, 11.5, 5.5, 1.8, 0.6, "✓ RÉSOLU\nSource: baseline",
      None, fc=GREEN_LT, ec=GREEN, fs=8)

# ── Level 4 ───────────────────────────────────────────────────────────────────
p_arrow(ax, 6.5, 5.22, 6.5, 4.6, "NON", RED, lw=1.8)
ax.text(6.65, 4.9, "NON", fontsize=8.5, color=RED, fontweight="bold")

section_box(ax, 0.5, 2.8, 12.0, 1.7,
            "Niveau 4 — Catalogue JSON curé (moroccan-ingredient-prices.json)", PURPLE, alpha=0.05)

p_box(ax, 6.5, 3.95, 7.0, 0.55,
      "estimateIngredientPriceWithCatalog(text, tier, catalog)",
      None, fc=PURPLE_LT, ec=PURPLE, bold=False, fs=8.5)
p_box(ax, 6.5, 3.2, 7.5, 0.55,
      "findCatalogEntry() → tier pricing → estimatePurchaseCost()",
      None, fc=PURPLE_LT, ec=PURPLE, bold=False, fs=8)

p_arrow(ax, 6.5, 2.92, 6.5, 2.35, "", PURPLE, lw=1.8)
p_box(ax, 6.5, 1.95, 3.5, 0.6, "✓ RÉSOLU\nSource: curated JSON",
      None, fc=GREEN_LT, ec=GREEN, fs=9)

# ── ResolvedPrice output ──────────────────────────────────────────────────────
p_box(ax, 6.5, 0.9, 10.0, 0.7,
      "ResolvedPrice { unitPrice, source, resolutionMethod, confidenceLevel, explanation }",
      None, fc=CHARCOAL, ec=CHARCOAL, bold=True, fs=8.5)
ax.text(6.5, 0.9, "ResolvedPrice  { unitPrice · source · resolutionMethod · confidenceLevel · explanation }",
        ha="center", va="center", fontsize=8.5, fontweight="bold",
        color=WHITE, zorder=5)

p_arrow(ax, 11.5, 9.55,  11.5, 1.25, "", GREEN, lw=1.5)
p_arrow(ax, 11.5, 7.35,  11.5, 1.25, "", GREEN, lw=0.5)
p_arrow(ax, 11.5, 5.2,   11.5, 1.25, "", GREEN, lw=0.5)
p_arrow(ax, 6.5,  1.6,   6.5,  1.25, "", GREEN, lw=1.5)
ax.annotate("", xy=(6.5, 1.25), xytext=(11.5, 1.25),
            arrowprops=dict(arrowstyle="-", color=GREEN, lw=1.5), zorder=5)
ax.annotate("", xy=(6.5, 1.25), xytext=(6.5, 1.25),
            arrowprops=dict(arrowstyle="-|>", color=GREEN, lw=1.5), zorder=5)

# ── selectSnapshotUnitPrice detail box ───────────────────────────────────────
section_box(ax, 0.6, 10.05, 5.0, 1.05,
            "selectSnapshotUnitPrice()", TEAL, alpha=0.04)
lines = [
    "① Si rawBaseUnit ≠ defaultUnit → ignorer unitPrice stocké",
    "② Dériver depuis packagePrice / packageQty (convertToBaseUnits)",
    "③ Plausibility: floor(kg)=2, ceil=500 DH/unit",
    "④ Si |stored/derived| > 3× → préférer derived",
]
for i, l in enumerate(lines):
    ax.text(0.72, 10.95 - i*0.22, l, fontsize=7, color=TEAL, va="center")

plt.tight_layout(rect=[0, 0, 1, 0.97])
out = "evaluation/diagrams/04-pricing-pipeline.png"
fig.savefig(out, dpi=180, bbox_inches="tight", facecolor=WARM_WHITE)
print(f"[OK] {out}")
plt.close(fig)

print("\n[DONE] All 4 diagrams saved to evaluation/diagrams/")
print("   01-architecture.png")
print("   02-sequence-meal-generation.png")
print("   03-er-diagram.png")
print("   04-pricing-pipeline.png")
