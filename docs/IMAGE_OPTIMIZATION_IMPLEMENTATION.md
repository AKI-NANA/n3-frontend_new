# 画像最適化エンジン - 実装ガイド

## 実装完了チェックリスト

### バックエンド ✅
- [x] ImageProcessorService.ts - P1/P2/P3生成、ウォーターマーク合成
- [x] ImageProcessorIntegration.ts - 出品統合ヘルパー
- [x] /api/image-rules - 画像ルールCRUD API
- [x] /api/image-optimization/generate-variants - P1/P2/P3生成API
- [x] Supabase image_rules テーブルスキーマ

### フロントエンド ✅
- [x] TabImageOptimization.tsx - 画像最適化タブUI
- [x] FullFeaturedModal.tsx - タブ統合
- [x] TabNavigation.tsx - タブボタン追加
- [x] /settings/image-rules - 設定管理画面

### ドキュメント ✅
- [x] IMAGE_OPTIMIZATION_ENGINE.md - セットアップガイド
- [x] IMAGE_OPTIMIZATION_IMPLEMENTATION.md - このファイル

---

## 実装パターン集

### 1. eBay出品時の画像処理

**ファイル**: `lib/ebay/create-listing.ts` など

```typescript
import { enhanceListingWithImageProcessing } from '@/lib/services/image'

export async function createEbayListingWithOptimization(
  product: Product,
  userId: string
) {
  // 既存の出品データを準備
  const listing = {
    title: product.title,
    description: product.description,
    price: product.price_usd,
    quantity: product.current_stock,
    imageUrls: product.listing_data?.image_urls || product.images?.map(i => i.url),
  }

  // 画像処理を適用（ズーム + ウォーターマーク）
  const enhancedListing = await enhanceListingWithImageProcessing(
    listing,
    product.sku,
    'ebay',
    userId,
    product.listing_data?.custom_zoom
  )

  // eBay APIで出品
  return await createEbayListing(enhancedListing)
}
```

### 2. Shopee出品時の画像処理

**ファイル**: `lib/mappers/shopee/ShopeeMapper.js` など

```typescript
import { prepareImagesForListing } from '@/lib/services/image'

export async function createShopeeListingWithOptimization(
  product: Product,
  userId: string
) {
  // 画像URLを取得
  const rawImageUrls = product.listing_data?.image_urls || []

  // 画像を処理（最大10枚まで）
  const processedImageUrls = await prepareImagesForListing(
    rawImageUrls.slice(0, 10), // Shopeeは最大10枚
    product.sku,
    'shopee',
    userId,
    product.listing_data?.custom_zoom
  )

  // Shopee APIで出品
  const shopeeData = {
    name: product.title,
    description: product.description,
    price: product.price_usd,
    stock: product.current_stock,
    images: processedImageUrls,
  }

  return await shopeeAPI.createProduct(shopeeData)
}
```

### 3. Amazon出品時（ウォーターマーク除外）

**ファイル**: `lib/mappers/amazon/AmazonGlobalMapper.js` など

```typescript
import { prepareImagesForListing } from '@/lib/services/image'

export async function createAmazonListingWithOptimization(
  product: Product,
  userId: string
) {
  // 画像URLを取得
  const rawImageUrls = product.listing_data?.image_urls || []

  // 画像を処理（Amazonなので自動的にウォーターマークは除外される）
  const processedImageUrls = await prepareImagesForListing(
    rawImageUrls.slice(0, 9), // Amazonは最大9枚
    product.sku,
    'amazon-global', // または 'amazon-jp'
    userId,
    product.listing_data?.custom_zoom
  )

  // Amazon MWS/SP-API で出品
  const amazonData = {
    Title: product.title,
    Description: product.description,
    Price: product.price_usd,
    Quantity: product.current_stock,
    MainImage: processedImageUrls[0],
    Images: processedImageUrls,
  }

  return await amazonAPI.createProduct(amazonData)
}
```

### 4. バッチ出品処理

**ファイル**: `app/api/batch-listing/route.ts` など

```typescript
import { enhanceListingWithImageProcessing } from '@/lib/services/image'

export async function POST(request: NextRequest) {
  const { products, marketplace, userId } = await request.json()

  const results = []

  for (const product of products) {
    try {
      // 各商品の画像を処理
      const listing = {
        title: product.title,
        description: product.description,
        price: product.price_usd,
        imageUrls: product.listing_data?.image_urls || [],
      }

      const enhancedListing = await enhanceListingWithImageProcessing(
        listing,
        product.sku,
        marketplace,
        userId,
        product.listing_data?.custom_zoom
      )

      // 出品実行
      const result = await createListing(marketplace, enhancedListing)
      results.push({ success: true, sku: product.sku, result })
    } catch (error) {
      results.push({ success: false, sku: product.sku, error: error.message })
    }
  }

  return NextResponse.json({ results })
}
```

### 5. 単一画像のみ処理（サムネイル用）

```typescript
import { prepareSingleImageForListing } from '@/lib/services/image'

export async function generateThumbnail(
  imageUrl: string,
  sku: string,
  marketplace: string,
  userId: string
) {
  // メイン画像のみ処理
  const processedUrl = await prepareSingleImageForListing(
    imageUrl,
    sku,
    marketplace,
    userId,
    1.15 // デフォルトのズーム率
  )

  return processedUrl
}
```

---

## エラーハンドリング

画像処理は自動的にエラーハンドリングを行います：

### フォールバック動作

```typescript
try {
  // 画像を処理
  const processed = await prepareImagesForListing(...)
  // processed には処理済みURLが含まれる
} catch (error) {
  // エラーが発生しても元のURLが返される（フォールバック）
  // 出品処理は続行される
}
```

### 個別エラー確認

```typescript
import { processImageForListing } from '@/lib/services/image'

const processedUrls = []

for (const url of imageUrls) {
  try {
    const processed = await processImageForListing(
      url,
      sku,
      marketplace,
      userId,
      customZoom
    )
    processedUrls.push(processed)
  } catch (error) {
    console.error(`画像処理失敗: ${url}`, error)
    processedUrls.push(url) // 元のURLを使用
  }
}
```

---

## パフォーマンス最適化

### 並列処理

画像処理は内部的に並列処理されていますが、さらに最適化する場合：

```typescript
import { processImageForListing } from '@/lib/services/image'

// 並列処理で高速化
const processPromises = imageUrls.map((url) =>
  processImageForListing(url, sku, marketplace, userId, customZoom)
)

const processedUrls = await Promise.all(processPromises)
```

### キャッシュ戦略

同じ画像を複数回処理しないように：

```typescript
const processedCache = new Map<string, string>()

async function getProcessedImage(url: string, sku: string, marketplace: string, userId: string) {
  const cacheKey = `${url}_${marketplace}_${sku}`

  if (processedCache.has(cacheKey)) {
    return processedCache.get(cacheKey)!
  }

  const processed = await prepareSingleImageForListing(url, sku, marketplace, userId)
  processedCache.set(cacheKey, processed)

  return processed
}
```

---

## テスト

### 単体テスト例

```typescript
// __tests__/image-processor.test.ts
import { enhanceListingWithImageProcessing } from '@/lib/services/image'

describe('Image Processing', () => {
  it('should process images for eBay listing', async () => {
    const listing = {
      title: 'Test Product',
      price: 100,
      imageUrls: ['https://example.com/image.jpg'],
    }

    const enhanced = await enhanceListingWithImageProcessing(
      listing,
      'TEST-SKU',
      'ebay',
      'user123',
      1.15
    )

    expect(enhanced.imageUrls).toBeDefined()
    expect(enhanced.imageUrls.length).toBe(1)
    expect(enhanced.imageUrls[0]).toContain('supabase')
  })

  it('should skip watermark for Amazon', async () => {
    const listing = {
      title: 'Test Product',
      price: 100,
      imageUrls: ['https://example.com/image.jpg'],
    }

    const enhanced = await enhanceListingWithImageProcessing(
      listing,
      'TEST-SKU',
      'amazon-global',
      'user123'
    )

    // Amazonではウォーターマークが適用されない
    expect(enhanced.imageUrls[0]).not.toContain('watermark')
  })
})
```

---

## よくある問題と解決方法

### Q1: 画像処理が遅い

**原因**: Sharp.jsの処理は高速ですが、画像サイズが大きい場合は時間がかかります。

**解決策**:
- 並列処理を活用
- 事前にP1/P2/P3を生成しておく
- Supabase Storageのリージョンを最適化

### Q2: メモリ不足エラー

**原因**: 大量の画像を同時処理するとメモリを消費します。

**解決策**:
```typescript
// バッチサイズを制限
const BATCH_SIZE = 5

for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
  const batch = imageUrls.slice(i, i + BATCH_SIZE)
  const processed = await prepareImagesForListing(batch, sku, marketplace, userId)
  processedUrls.push(...processed)
}
```

### Q3: Supabase Storage のアップロードが失敗

**原因**: ストレージバケットの設定やRLSポリシーの問題。

**解決策**:
1. Supabaseコンソールで `inventory-images` バケットを確認
2. RLSポリシーを確認（認証ユーザーがアップロード可能か）
3. `.env.local` の `SUPABASE_SERVICE_ROLE_KEY` を確認

---

## まとめ

この画像最適化エンジンは、以下の3ステップで簡単に統合できます：

1. **インポート**
   ```typescript
   import { enhanceListingWithImageProcessing } from '@/lib/services/image'
   ```

2. **適用**
   ```typescript
   const enhanced = await enhanceListingWithImageProcessing(
     listing, sku, marketplace, userId, customZoom
   )
   ```

3. **出品**
   ```typescript
   await createListing(marketplace, enhanced)
   ```

詳細なセットアップ手順は `docs/IMAGE_OPTIMIZATION_ENGINE.md` を参照してください。
