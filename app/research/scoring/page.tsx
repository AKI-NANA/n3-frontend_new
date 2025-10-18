'use client'

import { Award, TrendingUp, Users, DollarSign, Settings, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function ScoringPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl shadow-2xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Award className="w-12 h-12" />
            <div>
              <h1 className="text-4xl font-bold">スコアリングシステム</h1>
              <p className="text-amber-100 mt-2">
                リサーチデータに基づいて自動スコアリング。出品優先度を決定します
              </p>
            </div>
          </div>
        </div>

        {/* スコア計算式 */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">スコア計算ロジック</h2>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-indigo-600">
                総合スコア = 需要スコア(30点) + 競合スコア(20点) + 利益スコア(50点)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 需要スコア */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-bold text-green-800">需要スコア</h3>
              </div>
              <div className="text-4xl font-bold text-green-600 mb-2">30点</div>
              <p className="text-sm text-gray-700 mb-4">
                販売速度・市場需要に基づく評価
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>7日間販売数: 10個以上 = 満点</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>30日間販売数</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>市場需要レベル（高/中/低）</span>
                </li>
              </ul>
            </div>

            {/* 競合スコア */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-8 h-8 text-blue-600" />
                <h3 className="text-xl font-bold text-blue-800">競合スコア</h3>
              </div>
              <div className="text-4xl font-bold text-blue-600 mb-2">20点</div>
              <p className="text-sm text-gray-700 mb-4">
                競合数・価格帯による評価
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>競合セラー数（少ないほど高評価）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>価格帯の分布</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>競合の評価・実績</span>
                </li>
              </ul>
            </div>

            {/* 利益スコア */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-8 h-8 text-purple-600" />
                <h3 className="text-xl font-bold text-purple-800">利益スコア</h3>
              </div>
              <div className="text-4xl font-bold text-purple-600 mb-2">50点</div>
              <p className="text-sm text-gray-700 mb-4">
                利益率・利益額による評価
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span>予想利益率（20%以上 = 高評価）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span>予想利益額（絶対値）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span>リスク評価（関税・送料変動）</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ルール設定（準備中） */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-8 h-8 text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-800">スコアリングルール設定</h2>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
              開発中
            </span>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
            <p className="text-gray-700 mb-4">
              以下の機能を実装予定です:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">✓</span>
                <span>各スコア項目の重み付け調整（スライダーUI）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">✓</span>
                <span>閾値設定（最低スコア、除外条件）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">✓</span>
                <span>プレビュー機能（サンプルデータでスコア確認）</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">✓</span>
                <span>ルールプリセット保存・読み込み</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold">✓</span>
                <span>一括スコアリング実行（リサーチ済みデータ対象）</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 連携フロー */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8 border-2 border-indigo-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">スコアリング後の流れ</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white px-4 py-3 rounded-lg shadow-sm border-2 border-purple-200">
              <div className="text-xs text-gray-500 mb-1">STEP 1</div>
              <div className="font-bold">リサーチ完了</div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 rounded-lg shadow-lg">
              <div className="text-xs opacity-90 mb-1">STEP 2【現在】</div>
              <div className="font-bold">スコアリング</div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            
            <div className="bg-white px-4 py-3 rounded-lg shadow-sm border-2 border-orange-200">
              <div className="text-xs text-gray-500 mb-1">STEP 3</div>
              <div className="font-bold">スコア順にソート</div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            
            <div className="bg-white px-4 py-3 rounded-lg shadow-sm border-2 border-orange-200">
              <div className="text-xs text-gray-500 mb-1">STEP 4</div>
              <div className="font-bold">上位から出品</div>
            </div>
          </div>

          <p className="mt-6 text-gray-700">
            スコアが高い商品から優先的に出品されます。スコアはデータ編集画面で確認できます。
          </p>
        </div>

        {/* ナビゲーション */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <Link
            href="/research/ebay-research"
            className="bg-white hover:shadow-xl transition-all rounded-lg p-6 border-2 border-gray-200"
          >
            <div className="text-sm text-gray-500 mb-2">← 前のステップ</div>
            <div className="font-bold text-lg text-gray-800">リサーチツール</div>
            <div className="text-sm text-gray-600 mt-2">商品データを取得する</div>
          </Link>

          <Link
            href="/tools/editing"
            className="bg-white hover:shadow-xl transition-all rounded-lg p-6 border-2 border-gray-200"
          >
            <div className="text-sm text-gray-500 mb-2 text-right">次のステップ →</div>
            <div className="font-bold text-lg text-gray-800 text-right">データ編集</div>
            <div className="text-sm text-gray-600 mt-2 text-right">スコア付きデータを確認・編集</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
