"""
Soufra — Price Accuracy Evaluation Charts
==========================================
Generates a thesis-quality figure from the evaluation results
(Aswak Assalam scraped data evaluated against 25 Marjane prices).

Usage:
    python scripts/generate-eval-charts.py

Output:
    evaluation/price-accuracy-report.png  — full 4-panel figure (for thesis)
    evaluation/price-accuracy-mape-by-category.png  — standalone category bar
    evaluation/price-accuracy-actual-vs-predicted.png  — standalone scatter
"""

import os
import matplotlib
matplotlib.use("Agg")  # headless — no display needed
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# ── Soufra brand colours ──────────────────────────────────────────────────────
TEAL       = "#2D5F5D"
GOLD       = "#D4A574"
ORANGE     = "#E67E22"
GREEN      = "#27AE60"
RED        = "#E74C3C"
CHARCOAL   = "#2C3E50"
LIGHT_GREY = "#F3F4F6"
WARM_WHITE = "#FDFAF6"

os.makedirs("evaluation", exist_ok=True)

# ── Data ─────────────────────────────────────────────────────────────────────

# Overall headline metrics
overall = {
    "MAE (MAD)":   5.43,
    "MAPE (%)":    24.6,
    "RMSE (MAD)":  9.64,
    "Bias (MAD)": -0.61,
}
within = {"±10%": 32, "±20%": 44, "±30%": 72}

# By category
categories = ["Vegetables", "Meat &\nProtein", "Grains", "Fruits",
              "Pantry &\nSpices", "Dairy"]
cat_n      = [7, 4, 4, 4, 4, 2]
cat_mape   = [14.7, 15.1, 25.3, 29.5, 29.7, 57.1]
cat_mae    = [1.64, 13.60, 3.14, 3.25, 10.10, 2.00]
cat_within20 = [57, 50, 25, 25, 50, 50]

# By source
sources        = ["Baseline\ncatalog (n=13)", "Aswak scrape\n(n=12)"]
src_mape       = [24.3, 25.0]
src_mae        = [2.31, 8.82]
src_within20   = [54, 33]

# Individual ingredient actual vs predicted (derived from eval output)
ingredients = [
    ("Beef",          105.00, 105.00, "Meat & Protein"),
    ("Zucchini",        9.00,   8.95, "Vegetables"),
    ("Eggs",           17.50,  18.00, "Meat & Protein"),
    ("Tomatoes",        7.50,   7.95, "Vegetables"),
    ("Chickpeas",      24.50,  23.00, "Grains"),
    ("Potatoes",        7.50,   7.00, "Vegetables"),
    ("Chicken",        64.90,  60.00, "Meat & Protein"),
    ("Onions",         10.50,   9.00, "Vegetables"),
    ("Carrots",         6.00,   5.00, "Vegetables"),
    ("Lamb",          130.00, 120.00, "Meat & Protein"),
    ("Rice",           16.90,  23.80, "Grains"),
    ("Couscous",       14.50,  11.48, "Grains"),
    ("Bananas",        15.00,  18.00, "Fruits"),
    ("Apples",         16.00,  20.00, "Fruits"),
    ("Lemons",         11.00,  13.00, "Fruits"),
    ("Oranges",         7.00,  11.00, "Fruits"),
    ("Garlic",         35.00,  32.00, "Vegetables"),
    ("Bell Peppers",   12.00,  14.00, "Vegetables"),
    ("Milk",           10.50,  12.00, "Dairy"),
    ("Yogurt",          2.50,   5.00, "Dairy"),
    ("Olive Oil",      79.00,  65.00, "Pantry & Spices"),
    ("Veg. Oil",       19.50,  22.00, "Pantry & Spices"),
    ("Pasta",          13.50,  18.00, "Pantry & Spices"),
    ("Flour",           8.50,   5.59, "Pantry & Spices"),
    ("Lentils",        22.95,   5.59, "Grains"),
]

category_colors = {
    "Meat & Protein": ORANGE,
    "Vegetables":     TEAL,
    "Grains":         GOLD,
    "Fruits":         GREEN,
    "Pantry & Spices": "#6366F1",
    "Dairy":          "#EC4899",
}

# ── Figure 1: Full 4-panel report ─────────────────────────────────────────────
fig = plt.figure(figsize=(16, 12), facecolor=WARM_WHITE)
fig.suptitle(
    "Soufra — Price Accuracy Evaluation\n"
    "Predictor: Aswak Assalam (1,020 scraped snapshots)  ·  "
    "Ground truth: Marjane Casablanca (n = 25, 30 May 2026)",
    fontsize=13, fontweight="bold", color=CHARCOAL, y=0.98
)

gs = fig.add_gridspec(2, 2, hspace=0.42, wspace=0.35,
                      left=0.08, right=0.96, top=0.91, bottom=0.07)

# ── Panel A: MAPE by category (horizontal bar) ────────────────────────────────
ax1 = fig.add_subplot(gs[0, 0])
ax1.set_facecolor(WARM_WHITE)

sorted_idx = np.argsort(cat_mape)
cats_sorted = [categories[i] for i in sorted_idx]
mape_sorted = [cat_mape[i] for i in sorted_idx]
n_sorted    = [cat_n[i] for i in sorted_idx]
w20_sorted  = [cat_within20[i] for i in sorted_idx]

bar_colors = [TEAL if m <= 20 else GOLD if m <= 35 else RED for m in mape_sorted]
bars = ax1.barh(cats_sorted, mape_sorted, color=bar_colors,
                height=0.6, edgecolor="white", linewidth=0.8)

for bar, mape, n, w20 in zip(bars, mape_sorted, n_sorted, w20_sorted):
    ax1.text(bar.get_width() + 0.8, bar.get_y() + bar.get_height() / 2,
             f"{mape:.1f}%  (n={n})", va="center", fontsize=9, color=CHARCOAL)

ax1.axvline(x=25, color=CHARCOAL, linestyle="--", linewidth=1, alpha=0.4, label="25% MAPE")
ax1.set_xlabel("MAPE (%)", fontsize=10, color=CHARCOAL)
ax1.set_title("A  ·  MAPE by Category", fontsize=11, fontweight="bold",
              color=CHARCOAL, loc="left", pad=8)
ax1.set_xlim(0, 80)
ax1.tick_params(colors=CHARCOAL, labelsize=9)
ax1.spines[["top", "right"]].set_visible(False)
ax1.legend(fontsize=8, framealpha=0)

legend_patches = [
    mpatches.Patch(color=TEAL, label="≤ 20%"),
    mpatches.Patch(color=GOLD, label="20–35%"),
    mpatches.Patch(color=RED,  label="> 35%"),
]
ax1.legend(handles=legend_patches, fontsize=8, framealpha=0, loc="lower right")

# ── Panel B: Within-tolerance bands ──────────────────────────────────────────
ax2 = fig.add_subplot(gs[0, 1])
ax2.set_facecolor(WARM_WHITE)

bands = list(within.keys())
vals  = list(within.values())
bcolors = [TEAL, GREEN, GOLD]
b2 = ax2.bar(bands, vals, color=bcolors, width=0.5,
             edgecolor="white", linewidth=0.8)

for bar, v in zip(b2, vals):
    ax2.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1,
             f"{v}%", ha="center", va="bottom", fontsize=12,
             fontweight="bold", color=CHARCOAL)

ax2.set_ylabel("Share of predictions (%)", fontsize=10, color=CHARCOAL)
ax2.set_title("B  ·  Predictions Within Error Tolerance", fontsize=11,
              fontweight="bold", color=CHARCOAL, loc="left", pad=8)
ax2.set_ylim(0, 100)
ax2.axhline(50, color=CHARCOAL, linestyle=":", linewidth=0.8, alpha=0.4)
ax2.tick_params(colors=CHARCOAL, labelsize=10)
ax2.spines[["top", "right"]].set_visible(False)

# Headline metrics as text annotation
headline = (
    f"MAE = 5.43 MAD   ·   MAPE = 24.6%\n"
    f"RMSE = 9.64 MAD   ·   Bias = −0.61 MAD"
)
ax2.text(0.5, 0.08, headline, transform=ax2.transAxes,
         ha="center", va="bottom", fontsize=9, color=CHARCOAL,
         bbox=dict(boxstyle="round,pad=0.4", facecolor=LIGHT_GREY,
                   edgecolor="none", alpha=0.8))

# ── Panel C: Actual vs Predicted scatter ──────────────────────────────────────
ax3 = fig.add_subplot(gs[1, 0])
ax3.set_facecolor(WARM_WHITE)

actuals    = [row[1] for row in ingredients]
predicted  = [row[2] for row in ingredients]
cats_ing   = [row[3] for row in ingredients]
labels_ing = [row[0] for row in ingredients]
colors_ing = [category_colors[c] for c in cats_ing]

ax3.scatter(actuals, predicted, c=colors_ing, s=60, alpha=0.85,
            edgecolors="white", linewidths=0.6, zorder=3)

# Identity line
max_val = max(max(actuals), max(predicted)) * 1.05
ax3.plot([0, max_val], [0, max_val], color=CHARCOAL, linestyle="--",
         linewidth=1, alpha=0.5, label="Perfect prediction", zorder=2)

# ±20% band
x_line = np.linspace(0, max_val, 200)
ax3.fill_between(x_line, x_line * 0.8, x_line * 1.2,
                 alpha=0.07, color=GREEN, label="±20% band")

# Label the worst outliers
outlier_thresh = 15
for name, actual, pred, cat in ingredients:
    err_pct = abs(pred - actual) / actual * 100
    if err_pct > outlier_thresh or actual > 90:
        offset_x = 1 if pred < max_val * 0.8 else -2
        offset_y = -4 if pred > actual else 3
        ax3.annotate(name, (actual, pred),
                     xytext=(actual + offset_x, pred + offset_y),
                     fontsize=7.5, color=CHARCOAL, alpha=0.85,
                     arrowprops=dict(arrowstyle="-", color="#9CA3AF",
                                     lw=0.6, shrinkA=3, shrinkB=3))

ax3.set_xlabel("Actual price at Marjane (MAD/unit)", fontsize=10, color=CHARCOAL)
ax3.set_ylabel("Predicted price — Soufra (MAD/unit)", fontsize=10, color=CHARCOAL)
ax3.set_title("C  ·  Actual vs. Predicted Unit Price", fontsize=11,
              fontweight="bold", color=CHARCOAL, loc="left", pad=8)
ax3.set_xlim(0, max_val)
ax3.set_ylim(0, max_val)
ax3.tick_params(colors=CHARCOAL, labelsize=9)
ax3.spines[["top", "right"]].set_visible(False)
ax3.legend(fontsize=8, framealpha=0)

legend_patches_scatter = [
    mpatches.Patch(color=v, label=k) for k, v in category_colors.items()
]
ax3.legend(handles=legend_patches_scatter, fontsize=7.5, framealpha=0,
           loc="upper left", ncol=2)

# ── Panel D: Baseline vs Scraped comparison ───────────────────────────────────
ax4 = fig.add_subplot(gs[1, 1])
ax4.set_facecolor(WARM_WHITE)

x = np.arange(len(sources))
width = 0.28

b_mae   = ax4.bar(x - width, src_mae,      width, label="MAE (MAD)",    color=ORANGE, alpha=0.9)
b_mape  = ax4.bar(x,         src_mape,     width, label="MAPE (%)",     color=TEAL,   alpha=0.9)
b_w20   = ax4.bar(x + width, src_within20, width, label="Within ±20%", color=GREEN,  alpha=0.9)

for bars_grp in [b_mae, b_mape, b_w20]:
    for bar in bars_grp:
        h = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width() / 2, h + 0.5,
                 f"{h:.1f}", ha="center", va="bottom", fontsize=8.5,
                 color=CHARCOAL)

ax4.set_xticks(x)
ax4.set_xticklabels(sources, fontsize=9.5, color=CHARCOAL)
ax4.set_ylabel("Value", fontsize=10, color=CHARCOAL)
ax4.set_title("D  ·  Baseline vs. Scraped Snapshot Predictions",
              fontsize=11, fontweight="bold", color=CHARCOAL, loc="left", pad=8)
ax4.set_ylim(0, 70)
ax4.tick_params(colors=CHARCOAL, labelsize=9)
ax4.spines[["top", "right"]].set_visible(False)
ax4.legend(fontsize=8.5, framealpha=0, loc="upper right")

# ── Save full figure ──────────────────────────────────────────────────────────
out_full = "evaluation/price-accuracy-report.png"
fig.savefig(out_full, dpi=180, bbox_inches="tight", facecolor=WARM_WHITE)
print(f"Saved: {out_full}")
plt.close(fig)

# ── Figure 2: Standalone MAPE by Category ─────────────────────────────────────
fig2, ax = plt.subplots(figsize=(8, 4.5), facecolor=WARM_WHITE)
ax.set_facecolor(WARM_WHITE)

bars2 = ax.barh(cats_sorted, mape_sorted, color=bar_colors,
                height=0.55, edgecolor="white", linewidth=0.8)
for bar, mape, n in zip(bars2, mape_sorted, n_sorted):
    ax.text(bar.get_width() + 0.8, bar.get_y() + bar.get_height() / 2,
            f"{mape:.1f}%  (n={n})", va="center", fontsize=10, color=CHARCOAL)

ax.axvline(x=25, color=CHARCOAL, linestyle="--", linewidth=1, alpha=0.4)
ax.text(25.5, -0.6, "25% threshold", fontsize=8, color=CHARCOAL, alpha=0.6)
ax.set_xlabel("MAPE (%)", fontsize=11, color=CHARCOAL)
ax.set_title("Price Prediction Accuracy by Category\n"
             "Aswak (predictor) vs. Marjane Casablanca (ground truth)",
             fontsize=11, fontweight="bold", color=CHARCOAL)
ax.set_xlim(0, 78)
ax.tick_params(colors=CHARCOAL, labelsize=10)
ax.spines[["top", "right"]].set_visible(False)
ax.legend(handles=legend_patches, fontsize=9, framealpha=0, loc="lower right")

out_cat = "evaluation/price-accuracy-mape-by-category.png"
fig2.tight_layout()
fig2.savefig(out_cat, dpi=180, bbox_inches="tight", facecolor=WARM_WHITE)
print(f"Saved: {out_cat}")
plt.close(fig2)

# ── Figure 3: Standalone Actual vs Predicted ──────────────────────────────────
fig3, ax = plt.subplots(figsize=(7, 7), facecolor=WARM_WHITE)
ax.set_facecolor(WARM_WHITE)

ax.scatter(actuals, predicted, c=colors_ing, s=80, alpha=0.88,
           edgecolors="white", linewidths=0.6, zorder=3)
ax.plot([0, max_val], [0, max_val], color=CHARCOAL, linestyle="--",
        linewidth=1, alpha=0.5, label="Perfect prediction")
ax.fill_between(x_line, x_line * 0.8, x_line * 1.2,
                alpha=0.08, color=GREEN, label="±20% band")

for name, actual, pred, cat in ingredients:
    err_pct = abs(pred - actual) / actual * 100
    if err_pct > 12 or actual > 90:
        ax.annotate(name, (actual, pred),
                    xytext=(actual + 1.5, pred + 2),
                    fontsize=8, color=CHARCOAL, alpha=0.85,
                    arrowprops=dict(arrowstyle="-", color="#9CA3AF",
                                    lw=0.6, shrinkA=4, shrinkB=4))

ax.set_xlabel("Actual price at Marjane (MAD/unit)", fontsize=11, color=CHARCOAL)
ax.set_ylabel("Predicted price — Soufra (MAD/unit)", fontsize=11, color=CHARCOAL)
ax.set_title("Soufra Price Predictions vs. Ground Truth\n"
             "n = 25 ingredients, Marjane Casablanca, 30 May 2026",
             fontsize=11, fontweight="bold", color=CHARCOAL)
ax.set_xlim(0, max_val)
ax.set_ylim(0, max_val)
ax.tick_params(colors=CHARCOAL, labelsize=10)
ax.spines[["top", "right"]].set_visible(False)
ax.legend(handles=legend_patches_scatter + [
    mpatches.Patch(color=CHARCOAL, alpha=0, label=" "),
    mpatches.Patch(color="none", label="--- perfect prediction"),
], fontsize=8.5, framealpha=0, loc="upper left", ncol=2)

out_scatter = "evaluation/price-accuracy-actual-vs-predicted.png"
fig3.tight_layout()
fig3.savefig(out_scatter, dpi=180, bbox_inches="tight", facecolor=WARM_WHITE)
print(f"Saved: {out_scatter}")
plt.close(fig3)

print("\nDone. All charts saved to evaluation/")
