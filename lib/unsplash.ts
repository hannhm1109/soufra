const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY

export async function getRecipeImage(recipeName: string, cuisine: string): Promise<string | null> {
  try {
    const query = `${recipeName} ${cuisine} food`
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      }
    )
    const data = await res.json()
    return data.results?.[0]?.urls?.regular || null
  } catch {
    return null
  }
}
