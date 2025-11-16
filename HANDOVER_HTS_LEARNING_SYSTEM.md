# HTS学習システム実装 - 引き継ぎドキュメント

**作成日**: 2025-01-14
**進捗**: Phase 1-2完了、Phase 3途中

---

## ✅ 完了した作業

### Phase 1: データベース構築（完了）

#### テーブル作成
- ✅ `hts_learning_data` - 学習データ蓄積
- ✅ `hts_category_master` - カテゴリー→HTS判定（初期データ3件）
- ✅ `hts_brand_master` - ブランド→原産国推定（初期データ3件）
- ✅ `hts_material_patterns` - 素材パターン（初期データ3件）
- ✅ `products_master` - category_name, brand_nameカラム追加

#### PostgreSQL RPC関数
- ✅ `search_hts_with_learning()` - 3段階統合検索
- ✅ `record_hts_learning()` - 学習データ記録
- ✅ `search_hts_candidates()` - HTS公式検索（信頼度付き）
- ✅ `format_origin_countries()` - 原産国フォーマット（日本語表示）
- ✅ `get_hts_learning_stats()` - 統計情報取得

### Phase 2: Next.js API（完了）

#### API実装
- ✅ `/api/products/hts-lookup` - 3段階統合検索API
  - テスト成功: ポケモンカードで正しく動作確認
  - カテゴリ推定: 800点
  - ブランド推定: 750点
  - 公式検索: 355点

#### 型定義
- ✅ `/types/product.ts` - HTS関連フィールド追加
  - `category_name`, `brand_name`, `material`
  - `hts_score`, `hts_confidence`, `hts_source`
  - `origin_country_hint`
  - `HtsSearchResult`, `HtsSearchRequest`, `HtsSearchResponse`

---

## 🔄 現在の状況

### 動作確認済み

```bash
# APIテスト成功
curl -X POST http://localhost:3000/api/products/hts-lookup \
  -H "Content-Type: application/json" \
  -d '{
    "title_ja": "ポケモンカード リザードン",
    "category": "トレーディングカード",
    "brand": "ポケモン",
    "keywords": "playing cards"
  }'

# 結果
✅ HTS検索完了: 3件
  1. 9504.40.00.00 (スコア: 800, 信頼度: high, ソース: category_master)
  2. 9504.40.00.00 (スコア: 750, 信頼度: high, ソース: brand_master)
  3. 9504.40.00.00 (スコア: 354.96, 信頼度: high, ソース: official)
```

### データベーステスト成功

```sql
-- ブランド検索テスト
SELECT * FROM search_hts_with_learning(
    p_brand_ja := 'ポケモン',
    p_keywords := 'playing cards'
);

-- 結果
origin_country_hint: 日本(JP),アメリカ(US),ベルギー(BE)
```

---

## ⏭️ 次の作業（Phase 3: UI実装）

### 実装が必要な2つのUI

#### 1. Excel風一覧の拡張（優先）

**ファイル**: `/app/tools/editing/components/EditingTable.tsx`

**追加する列**:
- [ ] ブランド列（プルダウン）
- [ ] HTSスコア列（信頼度アイコン付き）
- [ ] 信頼度の色分け表示

**実装内容**:
```typescript
// 信頼度アイコン
const confidenceIcon = {
  very_high: '🎓', // 学習済み（緑背景）
  high: '📊',      // マスター推定（青背景）
  medium: '🔍',    // 検索結果（黄背景）
  low: '❌'        // 要確認（赤背景）
}

// スコアの色分け
900+ → 緑背景 (#f0fdf4)
700-899 → 青背景 (#eff6ff)
300-699 → 黄背景 (#fffbeb)
<300 → 赤背景 (#fef2f2)
```

**プルダウン機能**:
- カテゴリー選択時 → リアルタイムでHTS再検索
- ブランド選択時 → 原産国候補を表示
- 素材選択時 → HTS候補を更新

#### 2. モーダルの「HTS分類」タブ追加

**ファイル**: `/components/ProductModal/components/Tabs/TabEditing.tsx`（新規作成？）

**機能**:
- カテゴリー・ブランド・素材の自動提案
- HTS候補リストの表示（学習済み・マスター・公式）
- 原産国ヒントの表示
- 「このHTSを使用」ボタン
- 保存時に自動学習

---

## 📁 重要なファイル

### データベース
- `/database/migrations/hts_learning_system_phase1.sql` - テーブル作成
- `/database/functions/hts_learning_system_phase2.sql` - RPC関数

### API
- `/app/api/products/hts-lookup/route.ts` - 統合検索API

### 型定義
- `/types/product.ts` - Product型、HtsSearchResult型等

### UI（要修正）
- `/app/tools/editing/components/EditingTable.tsx` - Excel風一覧
- `/components/ProductModal/` - モーダル関連

---

## 🎯 UI実装の設計方針

### ハイブリッド方式
- **Excel風一覧**: スコアと色で一目で状況把握、高スコアは即座に確認
- **モーダル詳細**: 低スコア商品は詳細確認、AI判定理由を表示

### 優先順位
1. Excel風一覧にスコア列追加（視覚化）
2. プルダウンでリアルタイム再検索
3. モーダルのHTS分類タブ
4. 保存時の学習記録機能

---

## 🔧 次のステップ

### Step 1: EditingTable.tsxにスコア列追加

```typescript
// ヘッダーに追加
<th className="p-2 border-r border-border w-[80px] text-foreground bg-green-50">
  HTSスコア
</th>

// セルに追加
<td className="p-2 text-center border-r border-border" 
    style={{ backgroundColor: getScoreBackgroundColor(product.hts_score, product.hts_confidence) }}>
  <span className="text-xs">
    {getConfidenceIcon(product.hts_confidence)} {product.hts_score || '-'}
  </span>
</td>
```

### Step 2: プルダウン機能追加

```typescript
<select onChange={async (e) => {
  const result = await fetch('/api/products/hts-lookup', {
    method: 'POST',
    body: JSON.stringify({
      category: e.target.value,
      brand: product.brand_name,
      keywords: generateKeywords(product.title)
    })
  })
  // スコア更新
}}>
  <option value="">未選択</option>
  <option value="トレーディングカード">🎓 トレーディングカード</option>
</select>
```

---

## 📊 データベース初期データ

### カテゴリーマスター（3件）
- トレーディングカード → 9504.40.00.00
- スマートフォン → 8517.12.00.00
- Tシャツ → 6109.10.00.12

### ブランドマスター（3件）
- ポケモン → 9504.40.00.00 (原産国: JP/US/BE)
- Apple → 8517.12.00.00 (原産国: CN/VN/IN)
- Nike → 6403.99.00.00 (原産国: VN/CN/ID)

---

## 🐛 既知の問題

なし（現時点で全て動作確認済み）

---

## 📝 備考

- サーバー: `npm run dev` で起動
- Supabase: https://zdzfpucdyxdlavkgrvil.supabase.co
- 環境変数: `.env.local` に設定済み

---

## 🎓 学習システムの仕組み

### 3段階検索
1. **学習データ検索**（最優先、900+点）
   - 過去に確定したHTSコードから検索
2. **マスターデータ検索**（高優先、700-800点）
   - カテゴリー/ブランド/素材から推定
3. **HTS公式検索**（フォールバック、0-700点）
   - キーワードから公式HTSデータを検索

### 自動学習
- 商品保存時に `record_hts_learning()` を自動呼び出し
- 使用回数がカウントされ、次回から学習済みとして優先表示

---

次のチャットでは、**EditingTable.tsxにスコア列を追加**から始めてください！
