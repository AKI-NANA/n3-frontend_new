/**
 * 承認システム - 商品カード
 * NAGANO-3 v2.0
 */

'use client'

import { ApprovalProduct, CompletenessCheck } from '@/types/approval'
import Image from 'next/image'

interface ProductCardProps {
  product: ApprovalProduct
  selected: boolean
  onToggleSelect: (id: number) => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
  completeness: CompletenessCheck | null
}

export function ProductCard({
  product,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  completeness,
}: ProductCardProps) {
  const imageUrl = product.thumbnail || product.images?.[0] || '/placeholder-product.png'

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
  }

  const statusLabels = {
    pending: '⏳ 保留中',
    approved: '✅ 承認済み',
    rejected: '❌ 否認済み',
  }

  return (
    <div
      className={`bg-white rounded-xl border-2 overflow-hidden transition-all hover:shadow-xl ${
        selected ? 'ring-4 ring-blue-400 border-blue-500' : 'border-gray-200 hover:border-blue-300'
      }`}
    >
      {/* 選択チェックボックス */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(product.id)}
          className="w-6 h-6 cursor-pointer accent-blue-600"
        />
      </div>

      {/* ステータスバッジ */}
      <div className="absolute top-3 right-3 z-10">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${
            statusColors[product.approval_status]
          }`}
        >
          {statusLabels[product.approval_status]}
        </span>
      </div>

      {/* 画像 */}
      <div className="relative h-48 bg-gray-100">
        <Image
          src={imageUrl}
          alt={product.title}
          fill
          className="object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = '/placeholder-product.png'
          }}
        />
      </div>

      {/* 情報エリア */}
      <div className="p-4 space-y-3">
        {/* タイトル */}
        <h3 className="font-bold text-gray-900 line-clamp-2 min-h-[3rem]" title={product.title}>
          {product.title}
        </h3>

        {/* SKU */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-gray-600">SKU:</span>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{product.sku}</code>
        </div>

        {/* スコアと価格 */}
        <div className="grid grid-cols-2 gap-2">
          {/* スコア */}
          {product.final_score !== undefined && (
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(product.final_score)}
              </div>
              <div className="text-xs text-gray-600 font-medium">スコア</div>
            </div>
          )}

          {/* 推奨価格 */}
          {product.recommended_price !== undefined && (
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">
                ¥{Math.round(product.recommended_price).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 font-medium">推奨価格</div>
            </div>
          )}
        </div>

        {/* 利益情報 */}
        <div className="grid grid-cols-2 gap-2">
          {product.profit_jpy !== undefined && (
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                ¥{Math.round(product.profit_jpy).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">純利益</div>
            </div>
          )}

          {product.profit_rate !== undefined && (
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {product.profit_rate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">利益率</div>
            </div>
          )}
        </div>

        {/* データ完全性 */}
        {completeness && (
          <div className={`rounded-lg p-3 ${
            completeness.isComplete ? 'bg-green-50 border-2 border-green-300' : 'bg-amber-50 border-2 border-amber-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-bold ${
                completeness.isComplete ? 'text-green-700' : 'text-amber-700'
              }`}>
                {completeness.isComplete ? '✓ データ完全' : '⚠️ データ不足'}
              </span>
              <span className={`text-xs font-medium ${
                completeness.isComplete ? 'text-green-600' : 'text-amber-600'
              }`}>
                {completeness.completionRate}%
              </span>
            </div>

            {!completeness.isComplete && completeness.missingFields.length > 0 && (
              <div className="text-xs text-amber-700">
                不足: {completeness.missingFields.slice(0, 3).join(', ')}
                {completeness.missingFields.length > 3 && ` 他${completeness.missingFields.length - 3}件`}
              </div>
            )}
          </div>
        )}

        {/* HTSと原産国 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {product.hts_code && (
            <div>
              <span className="text-gray-600">HTS:</span>
              <span className="ml-1 font-mono font-semibold">{product.hts_code}</span>
            </div>
          )}
          {product.origin_country && (
            <div>
              <span className="text-gray-600">原産国:</span>
              <span className="ml-1 font-semibold">{product.origin_country}</span>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        {product.approval_status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onApprove(product.id)}
              disabled={!completeness?.isComplete}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                completeness?.isComplete
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title={completeness?.isComplete ? '承認' : 'データが不完全のため承認できません'}
            >
              ✓ 承認
            </button>

            <button
              onClick={() => onReject(product.id)}
              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all"
            >
              ✗ 否認
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
