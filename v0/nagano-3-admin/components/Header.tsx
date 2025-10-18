"use client"

import { useState, useEffect } from "react"
import { Search, Bell, Palette, TrendingUp, BookOpen, User } from "lucide-react"

interface WorldClocks {
  la: { time: string; date: string }
  ny: { time: string; date: string }
  berlin: { time: string; date: string }
  tokyo: { time: string; date: string }
}

interface ExchangeRates {
  usdJpy: number
  eurJpy: number
}

export default function Header() {
  const [clocks, setClocks] = useState<WorldClocks>({
    la: { time: "", date: "" },
    ny: { time: "", date: "" },
    berlin: { time: "", date: "" },
    tokyo: { time: "", date: "" },
  })

  const [rates, setRates] = useState<ExchangeRates>({
    usdJpy: 150.25,
    eurJpy: 165.8,
  })

  // 世界時計更新関数
  const updateWorldClocks = () => {
    const now = new Date()

    const formatTime = (timeZone: string) => {
      const time = now.toLocaleTimeString("ja-JP", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      const date = now.toLocaleDateString("ja-JP", {
        timeZone,
        month: "2-digit",
        day: "2-digit",
      })
      return { time, date }
    }

    setClocks({
      la: formatTime("America/Los_Angeles"),
      ny: formatTime("America/New_York"),
      berlin: formatTime("Europe/Berlin"),
      tokyo: formatTime("Asia/Tokyo"),
    })
  }

  // 為替レート更新関数（実際のAPIを使用する場合は適宜変更）
  const updateExchangeRates = () => {
    // デモ用のランダム変動
    setRates((prev) => ({
      usdJpy: prev.usdJpy + (Math.random() - 0.5) * 0.5,
      eurJpy: prev.eurJpy + (Math.random() - 0.5) * 0.8,
    }))
  }

  useEffect(() => {
    // 初期データ設定
    updateWorldClocks()
    updateExchangeRates()

    // 世界時計: 1分ごと更新
    const clockInterval = setInterval(updateWorldClocks, 60000)

    // 為替レート: 30秒ごと更新
    const rateInterval = setInterval(updateExchangeRates, 30000)

    // クリーンアップ
    return () => {
      clearInterval(clockInterval)
      clearInterval(rateInterval)
    }
  }, [])

  return (
    <header className="header-fixed">
      {/* ロゴ */}
      <div className="flex items-center">
        <div className="logo-gradient">N3</div>
        <span className="ml-3 text-xl font-bold text-gray-800">NAGANO-3</span>
      </div>

      {/* 検索バー */}
      <div className="search-bar">
        <div className="relative">
          <Search className="search-icon" size={16} />
          <input type="text" placeholder="検索..." className="search-input" />
        </div>
      </div>

      {/* 世界時計 */}
      <div className="flex items-center">
        <div className="world-clock">
          <div className="clock-label">LA</div>
          <div className="clock-time">{clocks.la.time}</div>
          <div className="clock-date">{clocks.la.date}</div>
        </div>

        <div className="world-clock">
          <div className="clock-label">NY</div>
          <div className="clock-time">{clocks.ny.time}</div>
          <div className="clock-date">{clocks.ny.date}</div>
        </div>

        <div className="world-clock">
          <div className="clock-label">Berlin</div>
          <div className="clock-time">{clocks.berlin.time}</div>
          <div className="clock-date">{clocks.berlin.date}</div>
        </div>

        <div className="world-clock japan">
          <div className="clock-label">Tokyo</div>
          <div className="clock-time japan">{clocks.tokyo.time}</div>
          <div className="clock-date">{clocks.tokyo.date}</div>
        </div>
      </div>

      {/* 為替レート */}
      <div className="flex items-center">
        <div className="exchange-rate">
          <div className="rate-label">USD/JPY</div>
          <div className="rate-value">{rates.usdJpy.toFixed(2)}</div>
        </div>

        <div className="exchange-rate">
          <div className="rate-label">EUR/JPY</div>
          <div className="rate-value">{rates.eurJpy.toFixed(2)}</div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center ml-4">
        <button className="action-button" title="通知">
          <Bell size={16} />
        </button>

        <button className="action-button" title="テーマ">
          <Palette size={16} />
        </button>

        <button className="action-button" title="ランキング">
          <TrendingUp size={16} />
        </button>

        <button className="action-button" title="マニュアル">
          <BookOpen size={16} />
        </button>

        <button className="action-button" title="ユーザー">
          <User size={16} />
        </button>
      </div>
    </header>
  )
}
