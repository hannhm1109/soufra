"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Clock, Flame, ChefHat, Heart, SlidersHorizontal, X } from "lucide-react"

interface Recipe {
  id: string
  name: string
  cuisine: string
  prepTime: number
  cookTime: number
  calories: number
  protein: number
  carbs: number
  fats: number
  difficulty: string
  tags: string[]
}

interface Props {
  recipes: Recipe[]
  feedbackMap: Record<string, boolean>
}

const cuisineEmojis: Record<string, string> = {
  moroccan: "🇲🇦",
  french: "🇫🇷",
  italian: "🇮🇹",
  mediterranean: "🫒",
  middle_eastern: "🧆",
  healthy: "🥗",
}

const cuisineColors: Record<string, { bg: string; color: string }> = {
  moroccan: { bg: "#FFF7F0", color: "#E67E22" },
  french: { bg: "#F0F7FF", color: "#3498DB" },
  italian: { bg: "#FFF0F0", color: "#E74C3C" },
  mediterranean: { bg: "#F0FFF4", color: "#27AE60" },
  middle_eastern: { bg: "#FFF9F0", color: "#D4A574" },
  healthy: { bg: "#F0F7F7", color: "#2D5F5D" },
}

const difficultyColors: Record<string, { bg: string; color: string }> = {
  easy: { bg: "#F0FFF4", color: "#27AE60" },
  medium: { bg: "#FFF7F0", color: "#E67E22" },
  hard: { bg: "#FFF0F0", color: "#E74C3C" },
}

type SortOption = "newest" | "calories_asc" | "calories_desc" | "time_asc"

export default function RecipeSearch({ recipes, feedbackMap }: Props) {
  const [search, setSearch] = useState("")
  const [selectedCuisine, setSelectedCuisine] = useState("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [showLikedOnly, setShowLikedOnly] = useState(false)
  const [sort, setSort] = useState<SortOption>("newest")
  const [showFilters, setShowFilters] = useState(false)

  const cuisines = ["all", ...Array.from(new Set(recipes.map(r => r.cuisine)))]

  const filtered = useMemo(() => {
    let result = recipes.filter(recipe => {
      const q = search.toLowerCase()
      const matchesSearch = !q ||
        recipe.name.toLowerCase().includes(q) ||
        recipe.cuisine.toLowerCase().includes(q) ||
        recipe.tags.some(t => t.toLowerCase().includes(q))
      const matchesCuisine = selectedCuisine === "all" || recipe.cuisine === selectedCuisine
      const matchesDifficulty = selectedDifficulty === "all" || recipe.difficulty === selectedDifficulty
      const matchesLiked = !showLikedOnly || feedbackMap[recipe.id] === true
      return matchesSearch && matchesCuisine && matchesDifficulty && matchesLiked
    })

    switch (sort) {
      case "calories_asc": return [...result].sort((a, b) => a.calories - b.calories)
      case "calories_desc": return [...result].sort((a, b) => b.calories - a.calories)
      case "time_asc": return [...result].sort((a, b) => (a.prepTime + a.cookTime) - (b.prepTime + b.cookTime))
      default: return result
    }
  }, [recipes, search, selectedCuisine, selectedDifficulty, showLikedOnly, sort, feedbackMap])

  const likedCount = recipes.filter(r => feedbackMap[r.id] === true).length
  const activeFilters = [
    selectedCuisine !== "all",
    selectedDifficulty !== "all",
    showLikedOnly,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedCuisine("all")
    setSelectedDifficulty("all")
    setShowLikedOnly(false)
    setSearch("")
  }

  if (recipes.length === 0) {
    return (
      <div
        className="rounded-2xl p-12 lg:p-16 text-center"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "#F0F7F7" }}>
          <ChefHat size={32} style={{ color: "#2D5F5D" }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: "#2C3E50" }}>No recipes yet</h3>
        <p className="mb-6 text-sm" style={{ color: "#6B7280" }}>
          Generate your first meal plan to start building your recipe collection
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
          style={{ backgroundColor: "#2D5F5D" }}>
          Go to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total recipes", value: recipes.length, color: "#2D5F5D", bg: "#F0F7F7" },
          { label: "Liked", value: likedCount, color: "#E74C3C", bg: "#FFF0F0" },
          { label: "Cuisines", value: cuisines.length - 1, color: "#E67E22", bg: "#FFF7F0" },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <p className="text-xl lg:text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs lg:text-sm" style={{ color: "#6B7280" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div
        className="rounded-2xl p-4 lg:p-6 mb-4"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-3.5" style={{ color: "#9CA3AF" }} />
            <input
              type="text"
              placeholder="Search recipes, cuisines, tags..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition-all text-sm"
              style={{ borderColor: "#E5E7EB", backgroundColor: "#FDFAF6" }}
              onFocus={e => e.target.style.borderColor = "#2D5F5D"}
              onBlur={e => e.target.style.borderColor = "#E5E7EB"}
            />
          </div>

          {/* Filter toggle (mobile-friendly) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-all relative"
            style={{
              borderColor: showFilters || activeFilters > 0 ? "#2D5F5D" : "#E5E7EB",
              backgroundColor: showFilters || activeFilters > 0 ? "#F0F7F7" : "white",
              color: "#2C3E50",
            }}>
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && (
              <span
                className="w-5 h-5 rounded-full text-xs flex items-center justify-center text-white font-bold absolute -top-1.5 -right-1.5"
                style={{ backgroundColor: "#E67E22" }}>
                {activeFilters}
              </span>
            )}
          </button>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="px-3 py-3 rounded-xl border text-sm outline-none hidden sm:block"
            style={{ borderColor: "#E5E7EB", backgroundColor: "white", color: "#2C3E50" }}>
            <option value="newest">Newest</option>
            <option value="calories_asc">Lowest cal</option>
            <option value="calories_desc">Highest cal</option>
            <option value="time_asc">Quickest</option>
          </select>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="pt-4 border-t space-y-3" style={{ borderColor: "#F0F0F0" }}>

            {/* Cuisine */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9CA3AF" }}>
                Cuisine
              </p>
              <div className="flex gap-2 flex-wrap">
                {cuisines.map(cuisine => (
                  <button
                    key={cuisine}
                    onClick={() => setSelectedCuisine(cuisine)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize"
                    style={{
                      backgroundColor: selectedCuisine === cuisine ? "#2D5F5D" : "#F0F7F7",
                      color: selectedCuisine === cuisine ? "white" : "#2C3E50",
                    }}>
                    {cuisine === "all" ? "All" : `${cuisineEmojis[cuisine] || ""} ${cuisine}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#9CA3AF" }}>
                Difficulty
              </p>
              <div className="flex gap-2">
                {["all", "easy", "medium", "hard"].map(diff => (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize"
                    style={{
                      backgroundColor: selectedDifficulty === diff
                        ? (diff === "all" ? "#2D5F5D" : difficultyColors[diff]?.color)
                        : "#F0F7F7",
                      color: selectedDifficulty === diff ? "white" : "#2C3E50",
                    }}>
                    {diff === "all" ? "All levels" : diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Liked + clear */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowLikedOnly(!showLikedOnly)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  backgroundColor: showLikedOnly ? "#FFF0F0" : "#F0F7F7",
                  color: showLikedOnly ? "#E74C3C" : "#2C3E50",
                }}>
                <Heart size={14} fill={showLikedOnly ? "#E74C3C" : "none"} style={{ color: showLikedOnly ? "#E74C3C" : "#9CA3AF" }} />
                Liked only
              </button>

              {activeFilters > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full transition-all"
                  style={{ color: "#6B7280", backgroundColor: "#F5F5F5" }}>
                  <X size={13} />
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results count + mobile sort */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "#6B7280" }}>
          <strong style={{ color: "#2C3E50" }}>{filtered.length}</strong> of {recipes.length} recipes
        </p>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
          className="px-3 py-2 rounded-xl border text-sm outline-none sm:hidden"
          style={{ borderColor: "#E5E7EB", backgroundColor: "white", color: "#2C3E50" }}>
          <option value="newest">Newest</option>
          <option value="calories_asc">Lowest cal</option>
          <option value="calories_desc">Highest cal</option>
          <option value="time_asc">Quickest</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {filtered.map(recipe => {
            const colors = cuisineColors[recipe.cuisine] || { bg: "#F0F7F7", color: "#2D5F5D" }
            const isLiked = feedbackMap[recipe.id] === true
            const isDisliked = feedbackMap[recipe.id] === false
            const total = recipe.protein + recipe.carbs + recipe.fats

            return (
              <Link key={recipe.id} href={`/dashboard/recipe/${recipe.id}`}>
                <div
                  className="rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 h-full"
                  style={{
                    backgroundColor: "white",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    border: isLiked ? "2px solid #27AE60" :
                            isDisliked ? "2px solid #FECACA" :
                            "2px solid transparent",
                  }}>

                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full"
                      style={{ backgroundColor: colors.bg, color: colors.color }}>
                      {cuisineEmojis[recipe.cuisine] || ""} {recipe.cuisine}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: difficultyColors[recipe.difficulty]?.bg || "#F0F7F7",
                          color: difficultyColors[recipe.difficulty]?.color || "#2D5F5D",
                        }}>
                        {recipe.difficulty}
                      </span>
                      {isLiked && <Heart size={14} fill="#E74C3C" style={{ color: "#E74C3C" }} />}
                    </div>
                  </div>

                  {/* Name */}
                  <h3
                    className="font-bold text-base lg:text-lg mb-3 leading-tight"
                    style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
                    {recipe.name}
                  </h3>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock size={12} style={{ color: "#9CA3AF" }} />
                      <span className="text-xs" style={{ color: "#6B7280" }}>
                        {recipe.prepTime + recipe.cookTime}min
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame size={12} style={{ color: "#E67E22" }} />
                      <span className="text-xs" style={{ color: "#6B7280" }}>
                        {recipe.calories} cal
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ChefHat size={12} style={{ color: "#9CA3AF" }} />
                      <span className="text-xs capitalize" style={{ color: "#6B7280" }}>
                        {recipe.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Macro bar */}
                  <div className="mb-3">
                    <div className="flex rounded-full overflow-hidden h-1.5 mb-1.5">
                      <div style={{ width: `${(recipe.protein / total) * 100}%`, backgroundColor: "#E67E22" }} />
                      <div style={{ width: `${(recipe.carbs / total) * 100}%`, backgroundColor: "#2D5F5D" }} />
                      <div style={{ width: `${(recipe.fats / total) * 100}%`, backgroundColor: "#D4A574" }} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: "#E67E22" }}>P {recipe.protein}g</span>
                      <span className="text-xs" style={{ color: "#2D5F5D" }}>C {recipe.carbs}g</span>
                      <span className="text-xs" style={{ color: "#D4A574" }}>F {recipe.fats}g</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {recipe.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {recipe.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <Search size={40} className="mx-auto mb-3" style={{ color: "#D1D5DB" }} />
          <h3 className="text-lg font-bold mb-1" style={{ color: "#2C3E50" }}>No recipes found</h3>
          <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
            Try different search terms or filters
          </p>
          <button
            onClick={clearFilters}
            className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
            style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
