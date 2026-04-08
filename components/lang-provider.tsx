"use client"
import { createContext, useContext, useState, useCallback } from "react"
import { translations, type Locale, type Translations } from "@/lib/translations"

interface LangContextValue {
  locale: Locale
  t: Translations
  setLocale: (locale: Locale) => void
}

const LangContext = createContext<LangContextValue>({
  locale: "en",
  t: translations.en,
  setLocale: () => {},
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof document === "undefined") return "en"
    const stored = document.cookie
      .split("; ")
      .find((row) => row.startsWith("lang="))
      ?.split("=")[1] as Locale | undefined
    return stored === "fr" || stored === "en" ? stored : "en"
  })

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    document.cookie = `lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }, [])

  return (
    <LangContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
