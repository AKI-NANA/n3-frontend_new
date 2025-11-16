# 競合情報・DDP計算結果の完全統合 - 実装完了

## ✅ 実装完了内容

### 1. Supabase関税率取得の改善

**ファイル**: `/app/api/ai-enrichment/save-result/route.ts`

**改善点**:
- ❌ 従来: 検索APIで関税率を取得（精度低い）
- ✅ 改善: Supabaseの `customs_duties` テーブルから直接取得
- ✅ フォールバック: `hs_codes_by_country` テーブルから取得

```typescript
// 優先順位
1. customs_duties テーブル（最も正確）
   ↓ なければ
2. hs_codes_by_country テーブル
   ↓ なければ
3. エラー（データベースに追加を促す）
```

**データ構造**:
```typescript
{
  hts_code: "9006.91.0000",
  origin_country: "CN",
  base_duty: 0.0275,        // 2.75%
  section301_rate: 0.075,   // 7.5%
  total_duty_rate: 0.1025   // 10.25%
}
```

---

### 2. DDP計算の自動実行

**実行タイミング**:
- AI商品データ強化完了後
- HTSコード・原産国保存後
- 関税率取得後

**計算内容**:
```typescript
{
  costJPY: number,          // 仕入れ価格
  dutyRate: number,         // 関税率
  weightKg: number,         // 重量
  dimensions: {...},        // 寸法
  hsCode: string,           // HTSコード
  originCountry: string     // 原産国
}
↓
{
  pricing: {
    US: { price: 29.99, duty: 3.07, ... },
    UK: { price: 25.50, duty: 2.61, ... },
    ...
  },
  breakeven: { US: 22.45, UK: 19.80, ... }
}
```

---

### 3. 拡張CSVエクスポートAPI

**ファイル**: `/app/api/export-enhanced/route.ts`

**新規追加カラム**:

#### 競合情報（セルミラーデータから）
| カラム名 | 説明 | 例 |
|---------|------|-----|
| 競合数 | 類似商品の数 | 10 |
| 競合最安値(USD) | 商品価格のみの最安値 | 24.99 |
| 競合最安値+送料(USD) | 送料込みの最安値 | 28.99 |
| 競合平均価格(USD) | 平均販売価格 | 32.50 |
| 最多出品者 | 最も多く出品しているセラー | seller123 |

#### DDP計算結果
| カラム名 | 説明 | 例 |
|---------|------|-----|
| 推奨価格15%(USD) | 15%利益時の価格 | 34.50 |
| 最安値時利益額(USD) | 競合最安で出した時の利益 | 5.50 |
| 最安値時利益率(%) | 競合最安で出した時の利益率 | 22.0 |
| 損益分岐点(USD) | breakeven price | 23.00 |

#### 関税情報
| カラム名 | 説明 | 例 |
|---------|------|-----|
| HTSコード | 10桁のHTS | 9006.91.0000 |
| 関税率(%) | 総関税率 | 10.25 |
| 原産国 | 2文字コード | CN |

---

## 🔄 完全なデータフロー

```
【ステップ1: データ収集】
セルミラー実行
  ├─ 競合商品データ取得
  ├─ 価格・送料情報
  └─ ebay_api_data.listing_reference に保存

【ステップ2: AI商品データ強化】
AIDataEnrichmentModal
  ├─ プロンプト生成（フロント）
  ├─ Gemini/Claude Web で処理
  ├─ JSON回答をコピー
  └─ /api/ai-enrichment/save-result
      ├─ Supabaseから関税率取得
      │   ├─ customs_duties（優先）
      │   └─ hs_codes_by_country（フォールバック）
      ├─ listing_data に保存
      │   ├─ hts_code
      │   ├─ origin_country
      │   ├─ duty_rate
      │   ├─ dimensions
      │   └─ ai_confidence
      └─ DDP計算自動実行
          └─ /api/ebay-intl-pricing/calculate

【ステップ3: CSVエクスポート】
/api/export-enhanced
  ├─ products テーブルから全データ取得
  ├─ ebay_api_data.listing_reference から競合情報計算
  │   ├─ 競合数
  │   ├─ 最安値（送料込・なし）
  │   ├─ 平均価格
  │   └─ 最多出品者
  ├─ listing_data から計算
  │   ├─ 推奨価格（15%利益）
  │   ├─ 最安値時利益
  │   └─ 損益分岐点
  └─ CSV生成（BOM付きUTF-8）
```

---

## 📊 価格戦略の判断ロジック

### 推奨価格（15%利益）の計算

```typescript
const costJPY = 3000            // 仕入れ価格
const exchangeRate = 150         // 為替レート
const costUSD = 3000 / 150      // = 20 USD

// 15%利益
const recommendedPrice = costUSD * 1.15  // = 23 USD
```

### 競合最安値で出す場合の利益計算

```typescript
const competitorMinPrice = 24.99  // 競合最安値
const costUSD = 20                // コスト

// 利益額
const profit = competitorMinPrice - costUSD  // = 4.99 USD

// 利益率
const profitRate = (profit / competitorMinPrice) * 100  // = 19.96%
```

### 判断基準

```
【ケース1】推奨価格 < 競合最安値
→ 推奨価格で出品（15%利益確保）
例: 推奨23 USD < 最安24.99 USD
   → 23 USDで出品、競争力あり

【ケース2】推奨価格 > 競合最安値
→ 競合最安値で出品（利益率が15%より低い）
例: 推奨23 USD > 最安21 USD
   → 最安値時利益率を確認
      - 10%以上 → 出品OK
      - 10%未満 → 要検討

【ケース3】最安値時利益率 < 5%
→ 出品見送り（利益が少なすぎる）
```

---

## 💡 使用方法

### 1. データ収集

```
1. セルミラー実行
   - 商品を選択
   - 「Mirror」ボタンをクリック
   - 競合データが ebay_api_data に保存される

2. AI商品データ強化
   - 「AI強化」ボタンをクリック
   - プロンプトをGemini/Claudeに貼り付け
   - JSON回答を貼り付けて保存
   - HTSコード・関税率・DDP計算が自動実行
```

### 2. CSVエクスポート

```
GET /api/export-enhanced

// 全商品
GET /api/export-enhanced

// 特定商品のみ
GET /api/export-enhanced?ids=1,2,3
```

**出力ファイル**: `products_enhanced_2025-10-29.csv`

### 3. Excelで分析

```
1. CSVを開く
2. フィルター適用
   - 競合最安値でソート
   - 最安値時利益率でフィルター（15%以上）
3. 出品判断
   - 推奨価格 vs 競合最安値を比較
   - 利益率を確認
   - 出品する商品を選択
```

---

## 📈 今後の改善

### Phase 2: リアルタイム価格比較

```typescript
// EditingTable に競合情報カラムを追加
{
  competitor_count: number,
  competitor_min_price: number,
  recommended_price: number,
  profit_at_min_price: number
}
```

### Phase 3: 自動価格調整

```typescript
// 競合最安値の監視
- 定期的にセルミラー実行
- 最安値が変動したら通知
- 自動的に価格調整の提案
```

### Phase 4: 利益最大化AI

```typescript
// 機械学習による価格最適化
- 過去の販売データ分析
- 競合の価格推移学習
- 最適な出品価格を提案
```

---

## ✅ 実装完了チェックリスト

- [x] Supabase関税率取得（customs_duties優先）
- [x] DDP計算自動実行
- [x] 拡張CSVエクスポートAPI
- [x] 競合情報カラム追加
- [x] DDP計算結果カラム追加
- [x] 価格戦略計算ロジック
- [x] 損益分岐点計算
- [x] 最安値時利益計算
- [x] BOM付きUTF-8出力
- [x] ドキュメント作成

---

## 🎉 まとめ

### 実現したこと

1. **正確な関税率取得**: Supabaseから直接取得
2. **DDP計算自動化**: AI強化後に自動実行
3. **競合情報統合**: セルミラーデータをCSVに反映
4. **価格戦略判断**: 推奨価格 vs 競合最安値の比較
5. **利益計算**: 最安値で出した時の利益を自動計算

### コスト

- **API課金**: ¥0（無料AIサービス使用）
- **処理時間**: 1商品あたり約30秒
- **精度**: Supabaseデータベース参照により高精度

---

**実装完了日**: 2025-10-29  
**API課金**: ¥0  
**データ精度**: Supabase参照により向上
