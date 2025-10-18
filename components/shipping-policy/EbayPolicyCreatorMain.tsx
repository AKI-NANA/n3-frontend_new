'use client'

import { useState } from 'react'
import { EbayPolicyCreatorFull } from './EbayPolicyCreatorFull'
import { EbayPolicyAutoGenerator } from './auto-generator/EbayPolicyAutoGenerator'
import { Zap, Edit3 } from 'lucide-react'

type Mode = 'select' | 'manual' | 'auto'

interface EbayPolicyCreatorMainProps {
  onBack?: () => void
}

export function EbayPolicyCreatorMain({ onBack }: EbayPolicyCreatorMainProps) {
  const [mode, setMode] = useState<Mode>('select')
  
  if (mode === 'manual') {
    return (
      <div>
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
          >
            ← 一覧に戻る
          </button>
        )}
        <EbayPolicyCreatorFull 
          onCancel={onBack}
          onSaveComplete={onBack}
        />
      </div>
    )
  }
  
  if (mode === 'auto') {
    return <EbayPolicyAutoGenerator onBack={() => setMode('select')} />
  }
  
  // モード選択画面
  return (
    <div className="max-w-4xl mx-auto bg-white p-8">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
        >
          ← 一覧に戻る
        </button>
      )}
      
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">配送ポリシー作成</h1>
        <p className="text-gray-600">作成方法を選択してください</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 手動作成 */}
        <button
          onClick={() => setMode('manual')}
          className="p-6 border-2 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <Edit3 className="w-6 h-6 text-blue-600 group-hover:text-white" />
            </div>
            <div className="text-xl font-bold">手動作成</div>
          </div>
          
          <div className="text-sm text-gray-600 space-y-2">
            <p>• 配送サービスを手動で選択</p>
            <p>• 送料を自由に設定</p>
            <p>• 細かい設定が可能</p>
            <p>• カスタマイズ性が高い</p>
          </div>
          
          <div className="mt-4 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full inline-block">
            利用可能
          </div>
        </button>
        
        {/* 自動生成 */}
        <button
          onClick={() => setMode('auto')}
          className="p-6 border-2 border-indigo-300 rounded-lg hover:border-indigo-500 hover:shadow-lg transition-all text-left group bg-gradient-to-br from-indigo-50 to-purple-50"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="text-xl font-bold">自動生成 ⚡</div>
          </div>
          
          <div className="text-sm text-gray-600 space-y-2">
            <p>• <strong>データベースから自動取得</strong></p>
            <p>• <strong>配送料金を自動設定</strong></p>
            <p>• <strong>eBay APIに一括登録</strong></p>
            <p>• <strong>12個のポリシーを即座に作成</strong></p>
          </div>
          
          <div className="mt-4 px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full inline-block animate-pulse">
            ✨ NEW - 利用可能
          </div>
        </button>
      </div>
      
      {/* 補足説明 */}
      <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
        <div className="font-semibold mb-2 text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-600" />
          おすすめ: 自動生成機能
        </div>
        <div className="text-xs text-gray-700 space-y-1">
          <p>• <strong>データベースに保存済みの12個の配送ポリシー</strong>を使用</p>
          <p>• 各ポリシーには<strong>21ゾーン × 252件の料金データ</strong>が設定済み</p>
          <p>• DDP/DDU方式、重量範囲、ハンドリング時間もすべて自動設定</p>
          <p>• ワンクリックでeBay APIに一括登録可能</p>
        </div>
      </div>
      
      {/* 手動作成の説明 */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <div className="font-semibold mb-2 text-sm">💡 手動作成を選ぶ場合</div>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• 特定の商品や特殊な配送条件がある場合</p>
          <p>• データベース以外の独自料金を設定したい場合</p>
          <p>• 細かいカスタマイズが必要な場合</p>
        </div>
      </div>
    </div>
  )
}
