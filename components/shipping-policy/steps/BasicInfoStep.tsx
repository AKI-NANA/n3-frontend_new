'use client'

import { Info } from 'lucide-react'

interface BasicInfoStepProps {
  formData: any
  onChange: (data: any) => void
}

export function BasicInfoStep({ formData, onChange }: BasicInfoStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-xl">📝</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            基本情報 / Basic Information
          </h2>
          <p className="text-sm text-gray-600">
            配送ポリシーの基本設定を行います
          </p>
        </div>
      </div>

      {/* ポリシー名 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          ポリシー名 / Policy Name *
        </label>
        <input
          type="text"
          value={formData.policyName}
          onChange={(e) => onChange({ policyName: e.target.value })}
          placeholder="例: Standard International Shipping"
          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          eBay上で表示されるポリシー名です（最大64文字）
        </p>
      </div>

      {/* マーケットプレイス */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          マーケットプレイス / Marketplace *
        </label>
        <select
          value={formData.marketplace}
          onChange={(e) => onChange({ marketplace: e.target.value })}
          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
        >
          <option value="EBAY_US">🇺🇸 eBay.com (US)</option>
          <option value="EBAY_GB">🇬🇧 eBay.co.uk (UK)</option>
          <option value="EBAY_DE">🇩🇪 eBay.de (Germany)</option>
          <option value="EBAY_AU">🇦🇺 eBay.com.au (Australia)</option>
          <option value="EBAY_CA">🇨🇦 eBay.ca (Canada)</option>
          <option value="EBAY_FR">🇫🇷 eBay.fr (France)</option>
          <option value="EBAY_IT">🇮🇹 eBay.it (Italy)</option>
          <option value="EBAY_ES">🇪🇸 eBay.es (Spain)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          このポリシーを適用するeBayサイトを選択してください
        </p>
      </div>

      {/* カテゴリータイプ */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          カテゴリータイプ / Category Type *
        </label>
        <select
          value={formData.categoryType}
          onChange={(e) => onChange({ categoryType: e.target.value })}
          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
        >
          <option value="ALL_EXCLUDING_MOTORS_VEHICLES">
            🏷️ すべてのカテゴリ（自動車除く）
          </option>
          <option value="MOTORS_VEHICLES">
            🚗 自動車・車両カテゴリ
          </option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          このポリシーを適用するカテゴリを選択してください
        </p>
      </div>

      {/* ハンドリングタイム */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          ハンドリングタイム / Handling Time *
        </label>
        <div className="flex items-center gap-4">
          <input
            type="number"
            min="1"
            max="30"
            value={formData.handlingTime}
            onChange={(e) => onChange({ handlingTime: parseInt(e.target.value) })}
            className="w-32 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          />
          <span className="text-gray-700 font-medium">営業日 / Business Days</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          入金確認後、商品を発送するまでの日数（配送時間は含まれません）
        </p>
        
        {/* 推奨値の表示 */}
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <div className="font-semibold mb-1">推奨ハンドリングタイム:</div>
              <ul className="space-y-1 ml-4">
                <li>• 1-2日: 在庫品・即発送可能な商品</li>
                <li>• 3-5日: 標準的な処理時間</li>
                <li>• 7-10日: 受注生産・カスタマイズ品</li>
                <li>• 15-30日: 海外調達・特殊商品</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* オプション設定 */}
      <div className="border-t-2 border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-800 mb-4">
          追加オプション / Additional Options
        </h3>
        
        <div className="space-y-3">
          {/* ローカルピックアップ */}
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={formData.localPickup}
              onChange={(e) => onChange({ localPickup: e.target.checked })}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-800">
                🏪 ローカルピックアップを許可 / Allow Local Pickup
              </div>
              <div className="text-xs text-gray-600 mt-1">
                購入者が直接商品を受け取りに来ることを許可します
              </div>
            </div>
          </label>

          {/* フレイト配送 */}
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={formData.freightShipping}
              onChange={(e) => onChange({ freightShipping: e.target.checked })}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-800">
                📦 フレイト配送を提供 / Offer Freight Shipping
              </div>
              <div className="text-xs text-gray-600 mt-1">
                大型商品（150ポンド以上）のフレイト配送を提供します
              </div>
            </div>
          </label>

          {/* グローバル配送プログラム */}
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={formData.globalShipping}
              onChange={(e) => onChange({ globalShipping: e.target.checked })}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-800">
                🌍 eBay Global Shipping Program を使用 / Use Global Shipping Program
              </div>
              <div className="text-xs text-gray-600 mt-1">
                eBayのグローバル配送プログラムを利用します（UK marketplace のみ）
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-yellow-800 mb-1">
              重要な注意事項:
            </div>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• ポリシー名は同じマーケットプレイス内でユニークである必要があります</li>
              <li>• ハンドリングタイムは購入者の期待に影響します。現実的な日数を設定してください</li>
              <li>• Global Shipping Programは現在UK marketplaceでのみ利用可能です</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
