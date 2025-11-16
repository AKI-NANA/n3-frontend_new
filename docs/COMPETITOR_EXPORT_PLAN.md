# CSV競合データエクスポート機能 - 実装計画

## 🎯 追加する競合情報カラム

### セルミラーデータから追加

```typescript
// ebay_api_data.listing_reference から取得
{
  競合販売数: number,          // referenceItems.length
  競合最安値USD: number,       // 最も安い price
  競合最安値送料込USD: number, // price + shippingCost の最小
  競合平均価格USD: number,     // 平均価格
  競合最多出品者: string       // 最も出品数が多い seller
}
```

### DDP計算データから追加

```typescript
// listing_data から取得
{
  推奨価格USD: number,         // 15%利益時の価格
  最安値時利益率: number,     // 競合最安値で出した時の利益率
  最安値時利益額USD: number,  // 競合最安値時の利益額
  損益分岐点USD: number,      // breakeven price
  HTS関税率: number,          // duty_rate
  原産国: string              // origin_country
}
```

---

## 📋 実装ファイル

### 1. エクスポートAPI拡張

ファイル: `/app/api/export-enhanced/route.ts`
