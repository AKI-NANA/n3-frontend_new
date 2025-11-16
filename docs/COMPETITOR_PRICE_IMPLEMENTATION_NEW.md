# 競合価格機能 完全実装ガイド

**作成日**: 2025-10-29  
**対象**: eBay Browse APIを使用した競合価格取得・分析機能

---

## 📊 現状確認

### ✅ 既に実装済み
1. **eBay Browse API エンドポイント** (`/app/api/ebay/browse/search/route.ts`)
   - OAuth 2.0 トークン取得（Client Credentials Flow）
   - 商品検索機能（Browse API）
   - 最安値・平均価格計算
   - 利益計算（簡易版）
   - API呼び出し制限管理
   - Supabase保存機能

### ❌ 未実装・要確認
1. フロントエンドからのAPI呼び出し
2. `yahoo_scraped_products` テーブルの存在確認
3. バルクリサーチUI
4. データの正しい表示

---

## 🔧 実装手順

### Step 1: データベース構造の確認と準備

#### 1.1 テーブルの存在確認

Supabaseダッシュボードで以下のSQLを実行：

```sql
-- yahoo_scraped_products テーブルの存在確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'yahoo_scraped_products'
);

-- テーブルが存在する場合、カラムを確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;
```

#### 1.2 必要なカラムの追加

テーブルが存在しない場合は作成し、必要なカラムを追加：

```sql
-- テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  yahoo_item_id TEXT,
  title TEXT,
  title_jp TEXT,
  ebay_title TEXT,
  ebay_category_id TEXT,
  weight_g INTEGER,
  actual_cost_jpy NUMERIC(10,2),
  
  -- 競合価格データ
  competitors_lowest_price NUMERIC(10,2),
  competitors_average_price NUMERIC(10,2),
  competitors_count INTEGER DEFAULT 0,
  
  -- SellerMirror（SM）データ
  sm_lowest_price NUMERIC(10,2),
  sm_average_price NUMERIC(10,2),
  sm_competitor_count INTEGER DEFAULT 0,
  
  -- 利益計算
  profit_amount_usd NUMERIC(10,2),
  profit_margin NUMERIC(5,2),
  
  -- 関税情報
  hts_code TEXT,
  tariff_rate NUMERIC(5,2),
  
  -- タイムスタンプ
  research_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- テーブルが既に存在する場合、カラムを追加
ALTER TABLE yahoo_scraped_products
ADD COLUMN IF NOT EXISTS competitors_lowest_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS competitors_average_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS competitors_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sm_lowest_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sm_average_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sm_competitor_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_amount_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS research_updated_at TIMESTAMP WITH TIME ZONE;

-- インデックス作成（検索高速化）
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_research_updated 
ON yahoo_scraped_products(research_updated_at);

CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_ebay_category 
ON yahoo_scraped_products(ebay_category_id);

-- コメント追加
COMMENT ON COLUMN yahoo_scraped_products.competitors_lowest_price IS 'eBay Browse APIから取得した最安値（USD）';
COMMENT ON COLUMN yahoo_scraped_products.competitors_average_price IS 'eBay Browse APIから取得した平均価格（USD）';
COMMENT ON COLUMN yahoo_scraped_products.competitors_count IS '競合商品数';
COMMENT ON COLUMN yahoo_scraped_products.sm_lowest_price IS 'SellerMirrorから取得した最安値（USD）';
COMMENT ON COLUMN yahoo_scraped_products.profit_amount_usd IS '利益額（USD）';
COMMENT ON COLUMN yahoo_scraped_products.profit_margin IS '利益率（%）';
```

### Step 2: APIエンドポイントの動作確認

#### 2.1 環境変数の確認

`.env.local` ファイルに以下が設定されているか確認：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# eBay API
EBAY_CLIENT_ID=your_client_id
EBAY_CLIENT_SECRET=your_client_secret
```

#### 2.2 APIエンドポイントのテスト

Next.jsサーバーを起動：

```bash
npm run dev
```

curlまたはPostmanでAPIをテスト：

```bash
curl -X POST http://localhost:3000/api/ebay/browse/search \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "test-product-001",
    "ebayTitle": "Pokemon Card Gengar VMAX",
    "ebayCategoryId": "183454",
    "weightG": 50,
    "actualCostJPY": 5000
  }'
```

期待されるレスポンス：

```json
{
  "success": true,
  "lowestPrice": 15.99,
  "averagePrice": 22.50,
  "competitorCount": 45,
  "profitAmount": 3.50,
  "profitMargin": 21.88,
  "breakdown": {
    "sellingPriceUSD": 15.99,
    "costUSD": 33.50,
    "shippingCostUSD": 12.99,
    "ebayFee": 2.06,
    "paypalFee": 1.05,
    "totalCost": 49.60
  },
  "apiStatus": {
    "callCount": 1,
    "dailyLimit": 5000,
    "remaining": 4999
  }
}
```

### Step 3: フロントエンド実装

#### 3.1 商品リサーチページの作成

新しいページを作成：`app/research/competitor-price/page.tsx`

```typescript
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface CompetitorPriceResult {
  success: boolean
  lowestPrice: number
  averagePrice: number
  competitorCount: number
  profitAmount: number
  profitMargin: number
  breakdown?: {
    sellingPriceUSD: number
    costUSD: number
    shippingCostUSD: number
    ebayFee: number
    paypalFee: number
    totalCost: number
  }
  apiStatus?: {
    callCount: number
    dailyLimit: number
    remaining: number
  }
}

export default function CompetitorPriceResearch() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompetitorPriceResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    productId: '',
    ebayTitle: '',
    ebayCategoryId: '',
    weightG: 50,
    actualCostJPY: 0
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/ebay/browse/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API呼び出しに失敗しました')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">競合価格リサーチ</h1>
      
      {/* フォーム */}
      <Card>
        <CardHeader>
          <CardTitle>商品情報を入力</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                商品ID（オプション）
              </label>
              <Input
                value={formData.productId}
                onChange={(e) => setFormData({...formData, productId: e.target.value})}
                placeholder="product-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                eBay英語タイトル *
              </label>
              <Input
                value={formData.ebayTitle}
                onChange={(e) => setFormData({...formData, ebayTitle: e.target.value})}
                placeholder="Pokemon Card Gengar VMAX"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                eBayカテゴリID（オプション）
              </label>
              <Input
                value={formData.ebayCategoryId}
                onChange={(e) => setFormData({...formData, ebayCategoryId: e.target.value})}
                placeholder="183454"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  重量（g）
                </label>
                <Input
                  type="number"
                  value={formData.weightG}
                  onChange={(e) => setFormData({...formData, weightG: parseInt(e.target.value) || 0})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  仕入れコスト（円）
                </label>
                <Input
                  type="number"
                  value={formData.actualCostJPY}
                  onChange={(e) => setFormData({...formData, actualCostJPY: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  検索中...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  競合価格を検索
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="space-y-4">
          {/* サマリー */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                検索結果
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">最安値</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${result.lowestPrice.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">平均価格</p>
                  <p className="text-2xl font-bold">
                    ${result.averagePrice.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">競合商品数</p>
                  <p className="text-2xl font-bold">
                    {result.competitorCount}件
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">利益率</p>
                  <p className={`text-2xl font-bold ${result.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {result.profitMargin.toFixed(2)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 利益詳細 */}
          {result.breakdown && (
            <Card>
              <CardHeader>
                <CardTitle>利益計算の内訳</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>販売価格</span>
                    <span className="font-semibold">${result.breakdown.sellingPriceUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>仕入れコスト</span>
                    <span>-${result.breakdown.costUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>送料</span>
                    <span>-${result.breakdown.shippingCostUSD.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>eBay手数料</span>
                    <span>-${result.breakdown.ebayFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>PayPal手数料</span>
                    <span>-${result.breakdown.paypalFee.toFixed(2)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>純利益</span>
                    <span className={result.profitAmount > 0 ? 'text-green-600' : 'text-red-600'}>
                      ${result.profitAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API使用状況 */}
          {result.apiStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">API使用状況</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <span>今日の呼び出し: {result.apiStatus.callCount} / {result.apiStatus.dailyLimit}</span>
                  <span className="text-gray-600">残り: {result.apiStatus.remaining}回</span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600"
                    style={{width: `${(result.apiStatus.callCount / result.apiStatus.dailyLimit) * 100}%`}}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
```

#### 3.2 バルクリサーチ機能の実装

複数商品を一括で処理する機能：`app/research/bulk-competitor-price/page.tsx`

```typescript
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface Product {
  id: string
  ebayTitle: string
  ebayCategoryId?: string
  weightG: number
  actualCostJPY: number
  status: 'pending' | 'processing' | 'success' | 'error'
  result?: {
    lowestPrice: number
    averagePrice: number
    competitorCount: number
    profitAmount: number
    profitMargin: number
  }
  error?: string
}

export default function BulkCompetitorPriceResearch() {
  const [products, setProducts] = useState<Product[]>([])
  const [processing, setProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // CSVファイルの読み込み
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const csv = event.target?.result as string
      const lines = csv.split('\n').filter(line => line.trim())
      
      // ヘッダー行をスキップ
      const data = lines.slice(1).map((line, index) => {
        const [id, ebayTitle, ebayCategoryId, weightG, actualCostJPY] = line.split(',')
        return {
          id: id || `product-${index + 1}`,
          ebayTitle: ebayTitle?.trim() || '',
          ebayCategoryId: ebayCategoryId?.trim(),
          weightG: parseInt(weightG) || 50,
          actualCostJPY: parseFloat(actualCostJPY) || 0,
          status: 'pending' as const
        }
      })

      setProducts(data)
    }

    reader.readAsText(file)
  }

  // バルク処理の実行
  const handleBulkProcess = async () => {
    setProcessing(true)
    setCurrentIndex(0)

    for (let i = 0; i < products.length; i++) {
      setCurrentIndex(i)
      
      const product = products[i]
      
      // ステータスを「処理中」に更新
      setProducts(prev => prev.map((p, idx) => 
        idx === i ? {...p, status: 'processing'} : p
      ))

      try {
        const response = await fetch('/api/ebay/browse/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            ebayTitle: product.ebayTitle,
            ebayCategoryId: product.ebayCategoryId,
            weightG: product.weightG,
            actualCostJPY: product.actualCostJPY
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'API呼び出しに失敗')
        }

        // 成功時の更新
        setProducts(prev => prev.map((p, idx) => 
          idx === i ? {
            ...p,
            status: 'success',
            result: {
              lowestPrice: data.lowestPrice,
              averagePrice: data.averagePrice,
              competitorCount: data.competitorCount,
              profitAmount: data.profitAmount,
              profitMargin: data.profitMargin
            }
          } : p
        ))

        // API呼び出し間隔を空ける（1秒待機）
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: any) {
        // エラー時の更新
        setProducts(prev => prev.map((p, idx) => 
          idx === i ? {
            ...p,
            status: 'error',
            error: error.message
          } : p
        ))
      }
    }

    setProcessing(false)
  }

  // CSV出力
  const handleExport = () => {
    const headers = ['ID', 'タイトル', '最安値', '平均価格', '競合数', '利益額', '利益率', 'ステータス']
    const rows = products.map(p => [
      p.id,
      p.ebayTitle,
      p.result?.lowestPrice?.toFixed(2) || '',
      p.result?.averagePrice?.toFixed(2) || '',
      p.result?.competitorCount || '',
      p.result?.profitAmount?.toFixed(2) || '',
      p.result?.profitMargin?.toFixed(2) || '',
      p.status
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `competitor-price-results-${Date.now()}.csv`
    a.click()
  }

  const statusIcon = (status: Product['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">一括競合価格リサーチ</h1>

      {/* CSV アップロード */}
      <Card>
        <CardHeader>
          <CardTitle>CSVファイルをアップロード</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              CSVファイル（形式: ID, タイトル, カテゴリID, 重量g, 仕入れ価格円）
            </label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={processing}
            />
          </div>

          {products.length > 0 && (
            <div className="flex gap-2">
              <Button 
                onClick={handleBulkProcess}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    処理中 ({currentIndex + 1}/{products.length})
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    一括処理を開始
                  </>
                )}
              </Button>

              <Button 
                variant="outline"
                onClick={handleExport}
                disabled={processing || products.every(p => p.status === 'pending')}
              >
                <Download className="mr-2 h-4 w-4" />
                結果をエクスポート
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 結果テーブル */}
      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>処理状況</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>タイトル</TableHead>
                  <TableHead className="text-right">最安値</TableHead>
                  <TableHead className="text-right">平均価格</TableHead>
                  <TableHead className="text-right">競合数</TableHead>
                  <TableHead className="text-right">利益率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>{statusIcon(product.status)}</TableCell>
                    <TableCell className="font-mono text-sm">{product.id}</TableCell>
                    <TableCell className="max-w-xs truncate">{product.ebayTitle}</TableCell>
                    <TableCell className="text-right">
                      {product.result ? `$${product.result.lowestPrice.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.result ? `$${product.result.averagePrice.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.result?.competitorCount || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.result ? (
                        <span className={product.result.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}>
                          {product.result.profitMargin.toFixed(2)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

### Step 4: 動作確認とデバッグ

#### 4.1 テストデータの準備

`test-products.csv` ファイルを作成：

```csv
id,ebayTitle,ebayCategoryId,weightG,actualCostJPY
product-001,Pokemon Card Gengar VMAX,183454,50,5000
product-002,Pokemon Card Pikachu VMAX,183454,50,4500
product-003,Pokemon Card Charizard VMAX,183454,50,8000
```

#### 4.2 単品テスト

1. `/research/competitor-price` にアクセス
2. テストデータを入力
3. 「競合価格を検索」ボタンをクリック
4. 結果が正しく表示されることを確認

#### 4.3 一括テスト

1. `/research/bulk-competitor-price` にアクセス
2. `test-products.csv` をアップロード
3. 「一括処理を開始」ボタンをクリック
4. 各商品が順次処理されることを確認
5. 「結果をエクスポート」でCSV出力を確認

### Step 5: トラブルシューティング

#### 問題1: 404エラー

**症状**: `/api/ebay/browse/search` が404エラー

**解決策**:
```bash
# Next.jsキャッシュをクリア
rm -rf .next
npm run dev
```

#### 問題2: トークン取得エラー

**症状**: "EBAY_CLIENT_ID または EBAY_CLIENT_SECRET が設定されていません"

**解決策**:
1. `.env.local` ファイルを確認
2. 環境変数が正しく設定されているか確認
3. サーバーを再起動

#### 問題3: データが保存されない

**症状**: API呼び出しは成功するが、Supabaseにデータが保存されない

**解決策**:
```sql
-- Supabaseでテーブルとカラムの存在を確認
SELECT column_name FROM information_schema.columns
WHERE table_name = 'yahoo_scraped_products'
AND column_name IN ('competitors_lowest_price', 'competitors_average_price');

-- Row Level Security (RLS) ポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'yahoo_scraped_products';

-- 必要に応じてRLSを一時的に無効化（開発環境のみ）
ALTER TABLE yahoo_scraped_products DISABLE ROW LEVEL SECURITY;
```

#### 問題4: API制限エラー

**症状**: "eBay Browse APIのレート制限に達しました"

**解決策**:
- 1時間あたりの呼び出し制限を確認
- API呼び出し間隔を調整（現在は1秒待機）
- 翌日まで待機

---

## 📚 参考資料

### eBay Browse API ドキュメント
- https://developer.ebay.com/api-docs/buy/browse/overview.html

### Supabase ドキュメント
- https://supabase.com/docs

### プロジェクト内の関連ファイル
- API実装: `/app/api/ebay/browse/search/route.ts`
- API呼び出し制限管理: `/lib/research/api-call-tracker.ts`

---

## 🎯 次のステップ

1. ✅ データベーステーブルの準備
2. ✅ APIエンドポイントの動作確認
3. ✅ フロントエンドの実装
4. ⏳ 実際のポケモンカードデータでテスト
5. ⏳ 関税計算の統合
6. ⏳ SellerMirror APIとの統合

---

**作成者**: Claude  
**最終更新**: 2025-10-29
