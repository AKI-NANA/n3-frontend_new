// app/tools/ebay-category-sync/page.tsx
'use client'

import { ManagementSidebar } from '@/components/management-suite/shared/ManagementSidebar'
import { CategoryFeeManager } from '@/components/ebay-pricing/category-fee-manager'

export default function EbayCategorySyncPage() {
  return (
    <div className="flex h-screen bg-background">
      <ManagementSidebar />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">eBayカテゴリ同期</h1>
            <p className="text-muted-foreground">
              eBay APIからカテゴリツリーとFVF手数料情報を取得し、データベースに保存します。
            </p>
          </div>

          <CategoryFeeManager />

          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <h3 className="font-semibold">使い方</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>「カテゴリ取得 + DB保存」ボタンをクリック</li>
              <li>eBay Trading APIからカテゴリ情報を取得（約10-30秒）</li>
              <li>FVF率を自動マッピング</li>
              <li>Supabaseに一括保存</li>
              <li>結果を確認</li>
            </ol>

            <h3 className="font-semibold mt-4">既知のFVF率</h3>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div>• ギター: 3.5%</div>
              <div>• 楽器その他: 6.35%</div>
              <div>• アート: 15%</div>
              <div>• 書籍: 14.95%</div>
              <div>• 衣料品: 15%</div>
              <div>• その他: 13.15%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
