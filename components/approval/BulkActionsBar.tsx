/**
 * 承認システム - 一括操作バー
 * NAGANO-3 v2.0
 */

'use client'

import { useState } from 'react'

interface BulkActionsBarProps {
  selectedCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onBulkApprove: () => void
  onBulkReject: (reason: string) => void
  processing: boolean
}

export function BulkActionsBar({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBulkApprove,
  onBulkReject,
  processing,
}: BulkActionsBarProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const handleBulkReject = () => {
    if (!rejectReason.trim()) {
      alert('否認理由を入力してください')
      return
    }

    onBulkReject(rejectReason)
    setShowRejectDialog(false)
    setRejectReason('')
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 shadow-xl sticky top-4 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-white">
              <div className="text-3xl font-bold">{selectedCount}</div>
              <div className="text-sm text-blue-100">商品選択中</div>
            </div>

            <div className="h-12 w-px bg-blue-400" />

            <button
              onClick={onDeselectAll}
              disabled={processing}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-medium transition-all disabled:opacity-50"
            >
              ✗ 選択解除
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBulkApprove}
              disabled={processing}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  ✓ 一括承認
                </>
              )}
            </button>

            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={processing}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50"
            >
              ✗ 一括否認
            </button>
          </div>
        </div>
      </div>

      {/* 否認理由入力ダイアログ */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              一括否認 - 理由を入力
            </h3>

            <p className="text-gray-600 mb-4">
              {selectedCount}件の商品を否認します。否認理由を入力してください。
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="例: 利益率が低すぎる、画像品質が不十分、など..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              rows={4}
              autoFocus
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectDialog(false)
                  setRejectReason('')
                }}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition-all"
              >
                キャンセル
              </button>

              <button
                onClick={handleBulkReject}
                disabled={!rejectReason.trim()}
                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                否認を実行
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
