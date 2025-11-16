# 競合商品分析システム - 残りの実装ガイド

## ✅ 完了した実装

### 1. 精度レベルシステム
- **レベル1（完全一致）**: 全フィールド一致 - 青枠
- **レベル2（高精度）**: 2つ以上一致 - 緑枠  
- **レベル3（標準）**: 1つ一致 - オレンジ枠
- 汎用化完了：ポケカ以外の商品にも対応

### 2. UI改善
- 精度レベルバッジ表示
- 選択状態の可視化
- 精度順ソート機能

---

## 🔴 未完了の実装

### 問題2: 価格選択の切り替えが反映されない

#### 必要な実装

**A. 価格選択APIエンドポイントの作成**

`/app/api/products/[id]/select-price/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const { productId, selectedItemId, selectedPrice } = await request.json();
  
  // 1. 選択された商品IDをDBに保存
  // 2. 選択された価格で利益を再計算
  // 3. sm_*カラムを更新
  
  const profitAnalysis = calculateProfit(selectedPrice, costJPY, weightG);
  
  await supabase
    .from('products')
    .update({
      sm_lowest_price: selectedPrice,
      sm_profit_amount_usd: profitAnalysis.profitAmount,
      sm_profit_margin: profitAnalysis.profitMargin,
      'ebay_api_data.browse_result.selectedItemId': selectedItemId
    })
    .eq('id', productId);
}
```

**B. フロントエンドの接続**

`TabCompetitors.tsx`の`handleSelectItem`関数:
```typescript
const handleSelectItem = async (itemId: string, totalPrice: number) => {
  setSelectedItemId(itemId);
  
  // APIを呼び出して価格を更新
  const response = await fetch(`/api/products/${product.id}/select-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: product.id,
      selectedItemId: itemId,
      selectedPrice: totalPrice
    })
  });
  
  if (response.ok) {
    // 商品データを再取得してUIを更新
    window.location.reload(); // または親コンポーネントの更新関数を呼ぶ
  }
};
```

**C. 選択状態の永続化**

DBに保存した`selectedItemId`を読み込み:
```typescript
const [selectedItemId, setSelectedItemId] = useState<string | null>(
  ebayData?.browse_result?.selectedItemId || 
  (browseItems.length > 0 ? (browseItems[0].itemId || '0') : null)
);
```

---

### 問題3: 販売数（SM）が表示されない

#### 調査手順

1. **データの確認**
```sql
SELECT 
  id, 
  sm_competitor_count,
  ebay_api_data->'browse_result'->>'competitorCount' as browse_count
FROM products 
WHERE id = [商品ID];
```

2. **表示箇所の特定**

販売数は以下の場所に表示されるべき：
- `/app/tools/editing/page.tsx` のテーブル
- `TabCompetitors.tsx` の統計エリア

3. **修正方法**

テーブルコンポーネントで`sm_competitor_count`を表示:
```typescript
<td>{product.sm_competitor_count || '-'}</td>
```

`TabCompetitors.tsx`では既に表示されている:
```typescript
<div>
  <div style={{ color: '#666', marginBottom: '0.25rem' }}>競合数</div>
  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2e7d32' }}>
    {smData.competitorCount}件  // ← これが表示されるはず
  </div>
</div>
```

#### デバッグ方法

`TabCompetitors.tsx`の冒頭に追加:
```typescript
console.log('🔍 SMデータ:', {
  sm_competitor_count: (product as any)?.sm_competitor_count,
  browse_result_count: ebayData?.browse_result?.competitorCount,
  smData
});
```

---

## 📋 実装優先順位

### 優先度1（即座に対応）
1. ✅ 汎用化完了
2. 🔴 価格選択APIの実装
3. 🔴 選択状態の永続化

### 優先度2（次回対応）
1. 販売数表示の調査とデバッグ
2. テーブル表示の更新
3. リアルタイム更新機能

---

## 🧪 テスト項目

### ポケカ以外のテスト
- [ ] フィギュア（Model, Brand, Character）
- [ ] 本（Title, Year, Language）
- [ ] 電子機器（Model, Brand, Type）

### 価格選択テスト
- [ ] レベル1商品を選択 → 価格・利益が更新される
- [ ] レベル3商品を選択 → 警告メッセージ表示
- [ ] モーダルを閉じて再度開く → 選択状態が維持される

### 販売数表示テスト
- [ ] 一括リサーチ後に販売数が表示される
- [ ] モーダル内の統計エリアに表示される
- [ ] エクセルエクスポート時に含まれる

---

## 🔧 実装のヒント

### 利益計算の再利用
既存の`calculateProfit`関数をAPIとフロント両方で使用:
```typescript
// lib/profit-calculator.ts
export function calculateProfit(sellingPriceUSD: number, costJPY: number, weightG: number) {
  const JPY_TO_USD = 0.0067;
  const costUSD = costJPY * JPY_TO_USD;
  
  let shippingCostUSD = 12.99;
  if (weightG > 1000) shippingCostUSD = 18.99;
  if (weightG > 2000) shippingCostUSD = 24.99;
  
  const ebayFee = sellingPriceUSD * 0.129;
  const paypalFee = sellingPriceUSD * 0.0349 + 0.49;
  const totalCost = costUSD + shippingCostUSD + ebayFee + paypalFee;
  
  return {
    profitAmount: sellingPriceUSD - totalCost,
    profitMargin: ((sellingPriceUSD - totalCost) / sellingPriceUSD) * 100
  };
}
```

### 状態管理の改善
React ContextまたはZustandを使って、モーダル内の変更を親コンポーネントに伝播:
```typescript
// contexts/ProductContext.tsx
export const ProductContext = createContext({
  updateProduct: (id: string, updates: Partial<Product>) => {}
});

// TabCompetitors.tsx
const { updateProduct } = useContext(ProductContext);

const handleSelectItem = async (itemId: string, totalPrice: number) => {
  const result = await updatePriceAPI(productId, itemId, totalPrice);
  updateProduct(productId, result); // 親を更新
};
```

---

## 📝 次のステップ

1. 価格選択APIの実装
2. フロントエンドとAPIの接続
3. 販売数表示のデバッグ
4. 統合テスト
5. ドキュメント更新
