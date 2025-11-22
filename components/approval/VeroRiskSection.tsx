/**
 * VeroRiskSection - EUリスク警告表示コンポーネント
 * NAGANO-3 v2.0
 *
 * 機能:
 * - EUリスクフラグに基づく警告表示
 * - リスク理由の明示
 * - 提案タイトルのワンクリックコピー
 */

'use client'

import { useState } from 'react'
import { AlertTriangle, Copy, CheckCircle } from 'lucide-react'

interface VeroRiskSectionProps {
  euRiskFlag: boolean
  euRiskReason?: string | null
  suggestedTitle?: string | null
  euArStatus?: string | null
}

export function VeroRiskSection({
  euRiskFlag,
  euRiskReason,
  suggestedTitle,
  euArStatus
}: VeroRiskSectionProps) {
  const [copied, setCopied] = useState(false)

  // リスクフラグがFALSEの場合は何も表示しない
  if (!euRiskFlag) {
    return null
  }

  // 提案タイトルをクリップボードにコピー
  const handleCopyTitle = async () => {
    if (!suggestedTitle) return

    try {
      await navigator.clipboard.writeText(suggestedTitle)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('コピーに失敗しました:', error)
      alert('コピーに失敗しました')
    }
  }

  // ARステータスのラベル取得
  const getArStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'REQUIRED_NO_AR':
        return '⚠️ AR情報が必要（未確保）'
      case 'HAS_AR':
        return '✓ AR情報あり'
      case 'NOT_REQUIRED':
        return 'AR情報不要'
      case 'PENDING':
        return '確認中'
      default:
        return ''
    }
  }

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 space-y-2">
      {/* 警告ヘッダー */}
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-900">EUリスク: 高リスク商品</h4>
          {euRiskReason && (
            <p className="text-xs text-red-800 mt-1">{euRiskReason}</p>
          )}
        </div>
      </div>

      {/* ARステータス */}
      {euArStatus && (
        <div className={`text-xs font-semibold px-2 py-1 rounded ${
          euArStatus === 'REQUIRED_NO_AR'
            ? 'bg-red-200 text-red-900'
            : euArStatus === 'HAS_AR'
            ? 'bg-green-200 text-green-900'
            : 'bg-yellow-200 text-yellow-900'
        }`}>
          {getArStatusLabel(euArStatus)}
        </div>
      )}

      {/* 提案タイトル（コピー可能） */}
      {suggestedTitle && (
        <div className="bg-white border border-red-200 rounded p-2">
          <div className="text-xs text-gray-600 font-semibold mb-1">
            推奨タイトル（リスク回避用）:
          </div>
          <div className="flex items-start gap-2">
            <div className="flex-1 text-xs text-gray-800 break-words">
              {suggestedTitle}
            </div>
            <button
              onClick={handleCopyTitle}
              className={`flex-shrink-0 p-1.5 rounded transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title="タイトルをコピー"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          {copied && (
            <div className="text-xs text-green-600 font-semibold mt-1">
              ✓ コピーしました
            </div>
          )}
        </div>
      )}

      {/* 出品ブロック警告（ARステータスがREQUIRED_NO_ARの場合） */}
      {euArStatus === 'REQUIRED_NO_AR' && (
        <div className="bg-red-200 border border-red-400 rounded p-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 font-bold">
              出品ブロック: 法的リスクのため登録できません
              <div className="font-normal mt-1">
                理由: 高リスクカテゴリであり、AR情報が未確保です
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
