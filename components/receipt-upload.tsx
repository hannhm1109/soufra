"use client"
import { useRef, useState } from "react"
import { ScanLine, X, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"

interface ParsedItem {
  name: string
  quantity?: string | null
  price?: number | null
}

interface ReceiptResult {
  storeName?: string | null
  totalMad?: number | null
  itemsFound: number
  pricesLearned: number
  items: ParsedItem[]
}

export default function ReceiptUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState<ReceiptResult | null>(null)
  const [showItems, setShowItems] = useState(false)
  const [error,     setError]     = useState("")

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large — max 10 MB")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          resolve(dataUrl.split(",")[1]) // strip the data:...;base64, prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch("/api/receipts/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to scan receipt")
        toast.error("Couldn't scan the receipt")
        return
      }

      setResult(data)
      toast.success(`Receipt scanned — ${data.itemsFound} items found!`)
    } catch {
      setError("Something went wrong. Please try again.")
      toast.error("Upload failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = "" // reset so same file can be re-selected
        }}
      />

      {/* Trigger button */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
        style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Scanning…</>
          : <><ScanLine size={15} /> Scan Receipt</>}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-sm"
          style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          <AlertCircle size={14} />
          {error}
          <button onClick={() => setError("")} className="ml-auto">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="mt-3 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>

          {/* Summary row */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#F0FFF4" }}>
                <CheckCircle size={18} style={{ color: "#27AE60" }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "#2C3E50" }}>
                  {result.storeName ?? "Receipt"} scanned
                </p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  {result.itemsFound} items
                  {result.totalMad != null && ` · ${result.totalMad} DH total`}
                  {result.pricesLearned > 0 && ` · ${result.pricesLearned} prices learned`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowItems(!showItems)}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                {showItems ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
              </button>
              <button
                onClick={() => setResult(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100">
                <X size={14} style={{ color: "#9CA3AF" }} />
              </button>
            </div>
          </div>

          {/* Items breakdown */}
          {showItems && result.items.length > 0 && (
            <div className="border-t px-4 pb-4 pt-3 space-y-1.5" style={{ borderColor: "#F3F4F6" }}>
              {result.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1">
                  <span style={{ color: "#2C3E50" }} className="capitalize">{item.name}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.quantity && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                        {item.quantity}
                      </span>
                    )}
                    {item.price != null && (
                      <span className="font-semibold text-xs" style={{ color: "#2D5F5D" }}>
                        {item.price} DH
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
