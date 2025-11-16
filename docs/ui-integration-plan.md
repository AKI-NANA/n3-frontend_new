# n3-frontend UI整合性・機能統合 実装計画

作成日: 2025-11-03
対象: 在庫監視システムUI + 競合信頼度プレミアム実装

## 📋 現状分析

### 既存UIコンポーネント
- `PriceAutomationTab` - 価格自動更新タブ（内容未確認）
- `PricingDefaultsSettings` - デフォルト設定
- 統合変動管理・実行履歴・スケジュール設定

### UIの問題点

1. **為替レート手動入力の不要性**
   - 価格計算は既存の pricing-engine.ts で自動計算
   - UIで為替レートを入力させる必要なし
   - global_pricing_strategy テーブルのパラメータで制御

2. **機能の重複・分散**
   - 「赤字ストッパー」は価格計算の一部
   - 別タブではなく、デフォルト設定に統合すべき

3. **競合信頼度プレミアム未実装**
   - eBay Browse API でセラー情報取得が必要
   - 一括取得でAPI使用回数削減
   - UIでの表示・設定なし

---

## 🎯 実装方針

### フェーズ1: PriceAutomationTab の整理

#### 現在の内容確認
```
/app/inventory-monitoring/page.tsx で import
実際のファイル: /components/pricing-automation/PriceAutomationTab.tsx
```

#### 期待される内容
- 15の価格調整ルールの個別ON/OFF
- 各ルールの実行ボタン
- 一括実行機能

#### 統合方針
**オプションA**: デフォルト設定に統合
- global_pricing_strategy の各フラグを UI で編集可能に
- タブを削除して PricingDefaultsSettings に統合

**オプションB**: 価格自動更新タブを機能別に再設計
- **自動ルール設定**: 各ルールのON/OFF
- **手動実行**: 即座に価格再計算
- **為替・コスト設定削除**: 不要

---

### フェーズ2: 競合信頼度プレミアム実装

#### 2-1. eBay Browse API拡張

**ファイル**: `/app/api/ebay/browse/search/route.ts`

**追加取得データ**:
```typescript
interface SellerInfo {
  username: string
  feedbackScore: number
  positivePercentage: number
  feedbackRating: string
}
```

**実装内容**:
- API レスポンスに seller 情報を追加
- 一括検索時にセラー情報も同時取得

#### 2-2. 競合信頼度計算ロジック

**新規ファイル**: `/lib/competitor-trust-calculator.ts`

```typescript
interface TrustPremium {
  trustScore: number // 0-100
  premiumPercent: number // 0-10%
  adjustedPrice: number
}

function calculateTrustPremium(
  seller: SellerInfo,
  basePrice: number
): TrustPremium {
  // Feedback Score の評価
  let trustScore = 0
  if (seller.feedbackScore >= 10000) trustScore += 40
  else if (seller.feedbackScore >= 5000) trustScore += 30
  else if (seller.feedbackScore >= 1000) trustScore += 20
  else if (seller.feedbackScore >= 500) trustScore += 10
  
  // Positive % の評価
  if (seller.positivePercentage >= 99.5) trustScore += 40
  else if (seller.positivePercentage >= 99.0) trustScore += 30
  else if (seller.positivePercentage >= 98.0) trustScore += 20
  
  // Premium % を計算 (最大10%)
  const premiumPercent = (trustScore / 100) * 10
  
  return {
    trustScore,
    premiumPercent,
    adjustedPrice: basePrice * (1 + premiumPercent / 100)
  }
}
```

#### 2-3. 最安値追従APIの修正

**ファイル**: `/app/api/pricing/follow-lowest/route.ts`

**修正内容**:
1. 競合商品取得時にセラー情報も取得
2. 各競合の価格に信頼度プレミアムを加算
3. 調整後の最安値を基準にする

**ロジック変更**:
```
旧: 最安値 = min(競合価格リスト)
新: 最安値 = min(競合価格 + 信頼度プレミアム)
```

#### 2-4. データベース追加

**テーブル**: `competitor_analysis`

```sql
CREATE TABLE competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER REFERENCES products_master(id),
  competitor_listing_id TEXT,
  competitor_seller TEXT,
  competitor_price_usd NUMERIC(10,2),
  seller_feedback_score INTEGER,
  seller_positive_percent NUMERIC(5,2),
  trust_score INTEGER,
  trust_premium_percent NUMERIC(5,2),
  adjusted_price_usd NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2-5. UI追加

**場所**: `PricingDefaultsSettings` コンポーネント

**追加項目**:
```tsx
<div>
  <Label>競合信頼度プレミアム</Label>
  <Switch
    checked={competitorTrustEnabled}
    onCheckedChange={setCompetitorTrustEnabled}
  />
  <p className="text-sm text-muted-foreground">
    高評価セラーの商品価格に+5-10%のプレミアムを加算
  </p>
</div>
```

---

### フェーズ3: UIの統合・整理

#### 3-1. タブ構成の再設計

**現在**:
1. 統合変動管理
2. 価格自動更新 ← 整理対象
3. デフォルト設定
4. 実行履歴
5. スケジュール設定

**提案**:
1. 統合変動管理
2. **価格ルール管理** ← 名称変更・機能整理
3. デフォルト設定（統合）
4. 実行履歴
5. スケジュール設定

#### 3-2. 「価格ルール管理」タブの内容

**セクション1: 自動調整ルール**
- ✅ 最安値追従（最低利益確保）
- ✅ SOLD数値上げ
- ✅ ウォッチャー値上げ
- ✅ 季節調整
- ✅ 競合信頼度プレミアム ← 新規
- 各ルールの ON/OFF スイッチ

**セクション2: 手動実行**
- 🔵 全ルール一括実行
- 🔵 選択ルールのみ実行
- 実行結果のリアルタイム表示

**セクション3: 高度な設定**
- 競合分析の詳細設定
- 信頼度プレミアムの閾値調整

#### 3-3. 削除すべきUI要素
- ❌ 為替レート手動入力フィールド
- ❌ 最低価格変動額（global_pricing_strategyで設定）
- ❌ 「赤字警告のある商品のみ更新」チェックボックス

---

## 🚀 実装順序

### ステップ1: PriceAutomationTab の内容確認
```bash
cat /components/pricing-automation/PriceAutomationTab.tsx
```

### ステップ2: 競合信頼度プレミアム実装
1. `/lib/competitor-trust-calculator.ts` 作成
2. Browse API にセラー情報追加
3. データベーステーブル作成
4. 最安値追従APIを修正

### ステップ3: UI統合
1. PriceAutomationTab を「価格ルール管理」に改名・再設計
2. 不要なUI要素を削除
3. 競合信頼度設定を追加

### ステップ4: テスト
1. 競合検索でセラー情報取得確認
2. 信頼度プレミアム計算確認
3. 最安値追従の動作確認

---

## 📊 API使用回数削減戦略

### 問題
- 商品ごとに個別API呼び出し → 回数消費大

### 解決策
1. **一括検索API**
   - 複数商品のキーワードを結合
   - 1回のAPI呼び出しで最大50商品検索

2. **キャッシング**
   - 検索結果を1時間キャッシュ
   - 同一商品の再検索を回避

3. **スマート更新**
   - 価格変動が大きい商品のみAPI呼び出し
   - 小額変動（±5%未満）はスキップ

---

## 📝 チェックリスト

### 競合信頼度プレミアム
- [ ] competitor-trust-calculator.ts 作成
- [ ] Browse API拡張（セラー情報追加）
- [ ] データベーステーブル作成
- [ ] 最安値追従API修正
- [ ] UI設定項目追加

### UI統合
- [ ] PriceAutomationTab 内容確認
- [ ] 価格ルール管理タブ再設計
- [ ] 不要UI要素削除
- [ ] デフォルト設定との統合

### テスト
- [ ] 競合検索動作確認
- [ ] 信頼度計算確認
- [ ] UI操作確認
- [ ] API使用回数確認

---

**次のアクション**: PriceAutomationTab.tsx の内容確認
