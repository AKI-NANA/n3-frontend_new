# Phase 1: Browse API修正パッチ

## 修正内容
日本人セラー数と中央値の計算を追加

## 修正箇所

### 1. analyzePrices関数を置き換え（行410-434）

```typescript
/**
 * 🔥 日本人セラー判定
 */
function isJapaneseSeller(item: any): boolean {
  // itemLocation.country が JP
  if (item.itemLocation?.country === 'JP') {
    return true
  }
  
  // seller.location が Japan を含む
  if (item.seller?.feedbackScore !== undefined && item.itemLocation?.country) {
    return item.itemLocation.country === 'JP'
  }
  
  // itemLocation.addressLine1 に日本語が含まれる
  const address = item.itemLocation?.addressLine1 || ''
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(address)
  if (hasJapanese) {
    return true
  }
  
  return false
}

/**
 * 🔥 中央値を計算
 */
function calculateMedian(prices: number[]): number {
  if (prices.length === 0) return 0
  
  const sorted = [...prices].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  
  if (sorted.length % 2 === 0) {
    // 偶数の場合：中央2つの平均
    return (sorted[middle - 1] + sorted[middle]) / 2
  } else {
    // 奇数の場合：中央の値
    return sorted[middle]
  }
}

/**
 * 🔥 最安値・平均価格・中央値・日本人セラー数を計算
 */
function analyzePrices(items: any[]) {
  const prices = items
    .map((item: any) => parseFloat(item.price?.value || '0'))
    .filter((price: number) => price > 0)

  if (prices.length === 0) {
    return {
      lowestPrice: 0,
      averagePrice: 0,
      medianPrice: 0,
      competitorCount: 0,
      jpSellerCount: 0
    }
  }

  const lowestPrice = Math.min(...prices)
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
  const medianPrice = calculateMedian(prices)
  
  // 🔥 日本人セラー数をカウント
  const jpSellerCount = items.filter(item => isJapaneseSeller(item)).length

  console.log(`  📊 価格分析: 商品数=${items.length}件, 最安値=${lowestPrice.toFixed(2)}, 平均=${averagePrice.toFixed(2)}, 中央値=${medianPrice.toFixed(2)}, 日本人セラー=${jpSellerCount}件`)

  return {
    lowestPrice: parseFloat(lowestPrice.toFixed(2)),
    averagePrice: parseFloat(averagePrice.toFixed(2)),
    medianPrice: parseFloat(medianPrice.toFixed(2)),
    competitorCount: items.length,
    jpSellerCount
  }
}
```

### 2. saveToDatabase関数を修正（行498-550付近）

`updateData`に以下を追加：

```typescript
// 🔥 新しいカラムに保存
sm_median_price_usd: Math.max(0, Math.min(9999.99, data.medianPrice || 0)),
sm_jp_seller_count: Math.max(0, Math.min(9999, data.jpSellerCount || 0)),
sm_jp_sellers: Math.max(0, Math.min(9999, data.jpSellerCount || 0)), // 旧カラムにも保存（ビュー互換性）
sm_competitors: Math.max(0, Math.min(9999, data.competitorCount || 0)), // 旧カラムにも保存（ビュー互換性）
sm_analyzed_at: new Date().toISOString(),
```

そして`browse_result`に追加：

```typescript
medianPrice: data.medianPrice,
jpSellerCount: data.jpSellerCount,
```

### 3. POSTエンドポイントのレスポンスを修正（行669-683付近）

```typescript
return NextResponse.json({
  success: true,
  lowestPrice: priceAnalysis.lowestPrice,
  averagePrice: priceAnalysis.averagePrice,
  medianPrice: priceAnalysis.medianPrice, // 🔥 追加
  jpSellerCount: priceAnalysis.jpSellerCount, // 🔥 追加
  competitorCount: priceAnalysis.competitorCount,
  profitAmount: profitAnalysis.profitAmount,
  profitMargin: profitAnalysis.profitMargin,
  breakdown: profitAnalysis.breakdown,
  items: items.slice(0, 10),
  apiStatus: updatedApiStatus
})
```

## 適用方法

1. `/Users/aritahiroaki/n3-frontend_new/app/api/ebay/browse/search/route.ts`を開く
2. 上記の修正を適用
3. サーバーを再起動

## テスト方法

```bash
# サーバー再起動
cd /Users/aritahiroaki/n3-frontend_new
rm -rf .next
npm run dev
```

ブラウザで商品の市場調査を実行し、コンソールログで以下を確認：
- `📊 価格分析` に中央値と日本人セラー数が表示される
- Supabaseで `sm_median_price_usd`, `sm_jp_seller_count` にデータが保存される
