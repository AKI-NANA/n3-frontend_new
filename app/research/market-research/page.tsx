'use client'

import { Construction } from 'lucide-react'

export default function MarketResearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-12 text-center">
        <Construction className="w-20 h-20 mx-auto mb-6 text-blue-600" />
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          市場リサーチツール
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          現在開発中です
        </p>
        <div className="bg-blue-50 rounded-lg p-6 text-left">
          <h2 className="font-bold text-gray-800 mb-3">実装予定の機能:</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>マルチマーケットプレイス横断調査（eBay, Amazon, Yahoo!, メルカリ）</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>市場トレンド分析とグラフ可視化</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>需要予測とシーズナリティ分析</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>競合他社の価格動向追跡</span>
            </li>
          </ul>
        </div>
        <div className="mt-8">
          <a
            href="/tools-hub"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            ツールハブに戻る
          </a>
        </div>
      </div>
    </div>
  )
}
