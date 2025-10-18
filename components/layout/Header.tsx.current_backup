"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Bell, Palette, TrendingUp, BookOpen, User, Pin } from "lucide-react"

interface WorldClocks {
  la: string
  ny: string
  berlin: string
  tokyo: string
}

export default function Header() {
  const [isVisible, setIsVisible] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [theme, setTheme] = useState<"standard" | "blue" | "zen" | "gentle" | "dark">("standard")
  const [clocks, setClocks] = useState<WorldClocks>({ la: "", ny: "", berlin: "", tokyo: "" })
  const [rates, setRates] = useState({ usdJpy: 154.39, eurJpy: 167.52 })
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date()
      setClocks({
        la: now.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false }),
        ny: now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }),
        berlin: now.toLocaleTimeString("en-US", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hour12: false }),
        tokyo: now.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false }),
      })
    }
    updateClocks()
    const interval = setInterval(updateClocks, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const header = headerRef.current
      if (!header) return

      if (isPinned) {
        setIsVisible(true)
      } else {
        const rect = header.getBoundingClientRect()
        if (e.clientY < 80 || (e.clientY >= rect.top && e.clientY <= rect.bottom)) {
          setIsVisible(true)
        } else {
          setIsVisible(false)
        }
      }
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [isPinned])

  useEffect(() => {
    if (isPinned) {
      setIsVisible(true)
    }
  }, [isPinned])

  useEffect(() => {
    if (isVisible || isPinned) {
      document.body.setAttribute('data-header-visible', 'true')
    } else {
      document.body.setAttribute('data-header-visible', 'false')
    }
  }, [isVisible, isPinned])

  const cycleTheme = () => {
    const themes: Array<"standard" | "blue" | "zen" | "gentle" | "dark"> = ["standard", "blue", "zen", "gentle", "dark"]
    const next = themes[(themes.indexOf(theme) + 1) % 5]
    setTheme(next)
    
    document.documentElement.classList.remove("dark")
    document.documentElement.removeAttribute("data-theme")
    
    if (next === "dark") {
      document.documentElement.classList.add("dark")
    } else if (next !== "standard") {
      document.documentElement.setAttribute("data-theme", next)
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case "standard": return "標準"
      case "blue": return "ブルー"
      case "zen": return "禅"
      case "gentle": return "目に優しい"
      case "dark": return "ダーク"
    }
  }

  return (
    <header 
      ref={headerRef}
      style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
      className={`fixed left-0 right-0 h-16 border-b z-[3000] 
                 flex items-center px-6 shadow-sm transition-all duration-200
                 ${(isVisible || isPinned) ? "top-0" : "-top-16"}`}
    >
      {/* N3 Logo */}
      <div 
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg mr-4"
        style={{ background: 'var(--logo-gradient)' }}
      >
        N3
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="注文番号、顧客ID、商品名で検索..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:outline-none text-sm"
        />
      </div>

      {/* World Clocks */}
      <div className="hidden xl:flex items-center gap-4 ml-6">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">西海岸</div>
          <div className="font-semibold text-sm">{clocks.la}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">東海岸</div>
          <div className="font-semibold text-sm">{clocks.ny}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">ドイツ</div>
          <div className="font-semibold text-sm">{clocks.berlin}</div>
        </div>
        <div className="text-center border-l pl-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">日本</div>
          <div className="font-semibold text-sm text-blue-600 dark:text-blue-400">{clocks.tokyo}</div>
        </div>
      </div>

      {/* Exchange Rates */}
      <div className="hidden 2xl:flex items-center gap-3 ml-4 border-l pl-4">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">USD/JPY</div>
          <div className="font-semibold text-sm">{rates.usdJpy.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">EUR/JPY</div>
          <div className="font-semibold text-sm">{rates.eurJpy.toFixed(2)}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 ml-auto">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        
        <button 
          onClick={cycleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={getThemeLabel()}
        >
          <Palette size={18} />
        </button>
        
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <TrendingUp size={18} />
        </button>
        
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <BookOpen size={18} />
        </button>
        
        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <User size={18} />
        </button>

        <button 
          onClick={() => setIsPinned(!isPinned)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          style={{
            backgroundColor: isPinned ? 'var(--primary)' : 'transparent',
            color: isPinned ? 'var(--primary-foreground)' : 'inherit'
          }}
          title={isPinned ? "固定解除" : "ヘッダー固定"}
        >
          <Pin size={18} />
        </button>
      </div>
    </header>
  )
}
