// Unit tests for the Soufra pricing pipeline.
//
// These are DB-free: every function under test is pure and takes its data as
// arguments, so the suite runs without a database, network, or API key.
//
//   npm test
//
// Covers the quantity/unit normalization that the thesis pricing chapter relies
// on, the end-to-end ingredient cost estimation, the ingredient matcher, and a
// regression guard for the bell-pepper / black-pepper grouping bug.

import { test } from "node:test"
import assert from "node:assert/strict"

import {
  convertToBaseUnits,
  parseQuantity,
} from "../lib/pricing/normalize"
import { matchIngredient, type IngredientRow } from "../lib/pricing/matching"
import {
  aggregateQuantity,
  estimateIngredientPriceWithCatalog,
  groupIngredients,
  guessCategory,
  stripLeadingQuantity,
  type CatalogEntry,
} from "../lib/pricing"

// ── parseQuantity ────────────────────────────────────────────────────────────

test("parseQuantity reads weight, volume, fractions and food-name units", () => {
  assert.deepEqual(parseQuantity("500g"), { value: 500, unit: "g" })
  assert.deepEqual(parseQuantity("1.5 kg"), { value: 1.5, unit: "kg" })
  assert.deepEqual(parseQuantity("1,5 kg"), { value: 1.5, unit: "kg" }) // French decimal comma
  assert.deepEqual(parseQuantity("2/3 cup"), { value: 2 / 3, unit: "cup" })
  assert.deepEqual(parseQuantity("12 eggs"), { value: 12, unit: "pc" })
  assert.deepEqual(parseQuantity("33cl"), { value: 33, unit: "cl" })
})

// ── convertToBaseUnits ───────────────────────────────────────────────────────

test("convertToBaseUnits handles standard weight/volume conversions", () => {
  assert.equal(convertToBaseUnits(500, "g", "kg"), 0.5)
  assert.equal(convertToBaseUnits(2, "kg", "g"), 2000)
})

test("convertToBaseUnits treats cl as centilitres, not millilitres", () => {
  // Regression: "15cl milk" must be 150 ml, not 15 ml.
  assert.equal(convertToBaseUnits(15, "cl", "ml"), 150)
  assert.equal(convertToBaseUnits(50, "cl", "l"), 0.5)
})

test("convertToBaseUnits converts weight into leafy bunches and packs", () => {
  assert.equal(convertToBaseUnits(200, "g", "bunch"), 0.8) // ~250 g per bunch
  assert.equal(convertToBaseUnits(200, "g", "250g"), 0.8) // packaged base unit
})

test("convertToBaseUnits handles count-based conversions", () => {
  assert.equal(convertToBaseUnits(6, "pc", "dozen"), 0.5)
  assert.equal(convertToBaseUnits(1, "slice", "loaf"), 0.05) // 20 slices per loaf
})

test("convertToBaseUnits refuses an unknown count→weight conversion", () => {
  // There is deliberately no blanket pc→kg rule: a garlic clove is not 150 g.
  assert.equal(convertToBaseUnits(5, "pc", "kg"), null)
})

// ── estimateIngredientPriceWithCatalog (end-to-end) ──────────────────────────

const catalog: CatalogEntry[] = [
  {
    slug: "chicken-breast",
    name: "Chicken breast",
    category: "Meat & Protein",
    defaultUnit: "kg",
    aliases: ["chicken breast", "chicken"],
    referencePriceMad: 72,
    confidence: 0.7,
    sourceName: "test",
    sourceType: "curated",
  },
  {
    slug: "eggs",
    name: "Eggs",
    category: "Meat & Protein",
    defaultUnit: "dozen",
    aliases: ["eggs", "egg"],
    referencePriceMad: 18,
    confidence: 0.7,
    sourceName: "test",
    sourceType: "curated",
  },
  {
    slug: "spinach",
    name: "Spinach",
    category: "Vegetables",
    defaultUnit: "bunch",
    aliases: ["spinach"],
    referencePriceMad: 5.5,
    confidence: 0.7,
    sourceName: "test",
    sourceType: "curated",
  },
]

test("estimate prices a weight-based ingredient by converting to kg", () => {
  const est = estimateIngredientPriceWithCatalog("400g chicken breast", "supermarket", catalog)
  assert.equal(est.canonicalName, "Chicken breast")
  assert.equal(est.estimatedCost, 28.8) // 0.4 kg × 72 DH/kg
})

test("estimate prices eggs per dozen and labels them as eggs", () => {
  const est = estimateIngredientPriceWithCatalog("8 eggs", "supermarket", catalog)
  assert.equal(est.estimatedCost, 12) // 8/12 dozen × 18 DH/dozen
  assert.equal(est.quantity, "8 eggs") // not "8 pc"
})

test("estimate converts grams of leafy veg into bunches", () => {
  const est = estimateIngredientPriceWithCatalog("200g spinach", "supermarket", catalog)
  assert.equal(est.estimatedCost, 4.4) // 0.8 bunch × 5.5 DH/bunch
})

// ── matchIngredient ──────────────────────────────────────────────────────────

const ingredientRows: IngredientRow[] = [
  {
    id: "1",
    slug: "chicken-breast",
    name: "Chicken breast",
    category: "Meat & Protein",
    aliases: [{ alias: "chicken breast" }, { alias: "poulet" }],
  },
  {
    id: "2",
    slug: "tomatoes",
    name: "Tomatoes",
    category: "Vegetables",
    aliases: [{ alias: "tomato" }, { alias: "tomates" }],
  },
]

test("matchIngredient resolves a French alias to the right ingredient", () => {
  const match = matchIngredient({ normalizedProductName: "poulet", ingredients: ingredientRows })
  assert.equal(match?.ingredientId, "1")
  assert.equal(match?.matchType, "alias")
})

test("matchIngredient returns null instead of a false positive", () => {
  const match = matchIngredient({ normalizedProductName: "shampoo", ingredients: ingredientRows })
  assert.equal(match, null)
})

// ── stripLeadingQuantity ─────────────────────────────────────────────────────

test("stripLeadingQuantity strips quantities, units and descriptors but keeps the food", () => {
  assert.equal(stripLeadingQuantity("500g chicken"), "chicken")
  assert.equal(stripLeadingQuantity("2 large onions"), "onions")
  assert.equal(stripLeadingQuantity("3 eggs"), "eggs") // food name kept, not eaten as a unit
})

// ── aggregateQuantity ────────────────────────────────────────────────────────

test("aggregateQuantity sums same-unit quantities and falls back on mixed units", () => {
  assert.equal(aggregateQuantity(["200g tomatoes", "300g tomatoes"]), "500g")
  assert.equal(aggregateQuantity(["200g rice", "1 cup rice"]), "x2") // units can't be merged
})

// ── groupIngredients (regression) ────────────────────────────────────────────

test("groupIngredients merges plurals but keeps distinct ingredients apart", () => {
  assert.equal(groupIngredients(["2 carrots", "1 carrot"]).size, 1)
  // Regression: bell pepper (a vegetable) must NOT merge into black pepper (a spice).
  assert.equal(groupIngredients(["1 bell pepper", "1 tsp black pepper"]).size, 2)
})

// ── guessCategory ────────────────────────────────────────────────────────────

test("guessCategory classifies common ingredients", () => {
  assert.equal(guessCategory("chicken breast"), "Meat & Protein")
  assert.equal(guessCategory("tomatoes"), "Vegetables")
  assert.equal(guessCategory("rice"), "Grains")
  assert.equal(guessCategory("yogurt"), "Dairy")
})
