"use client"
import { useLang } from "@/components/lang-provider"

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLang()

  return (
    <div
      className="flex items-center rounded-lg overflow-hidden"
      style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
      {(["en", "fr"] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLocale(lang)}
          className="px-3 py-1.5 text-xs font-bold transition-all duration-150"
          style={{
            backgroundColor: locale === lang ? "#D4A574" : "transparent",
            color: locale === lang ? "#2D5F5D" : "rgba(255,255,255,0.55)",
            borderRadius: lang === "en" ? "6px 0 0 6px" : "0 6px 6px 0",
          }}>
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
