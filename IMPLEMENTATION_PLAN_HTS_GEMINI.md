# HTS学習システム Phase 2-B: Gemini統合実装計画

**作成日**: 2025-01-14  
**ステータス**: 未着手  
**前提**: Phase 2（API実装）完了

---

## 🎯 目的

Gemini Web UIからの構造化データ出力を受け取り、HTS学習システムと統合する。

---

## 📋 実装タスク

### タスク1: Gemini出力フォーマット定義

**ファイル**: 新規ドキュメント `/docs/GEMINI_PROMPT_SPEC.md`

**内容**:
```markdown
# Gemini Web UI プロンプト仕様

## ユーザーがコピペするプロンプト

【入力情報】
タイトル: [商品タイトル]
カテゴリー: [カテゴリー名]
ブランド: [ブランド名]

【処理指示】
上記の情報に基づき、以下の全ての情報を推論・生成し、指定された出力形式で回答してください。

【生成必須項目】
1. HTS_キーワード: HTS分類に最適な2-3語のフレーズを5つ、カンマ区切り
2. 推奨素材: 商品の一般的な構成素材を1-2つ
3. 推奨原産国: 2文字コード（例: JP, CN）
4. リライトタイトル: VERO配慮の英語タイトル
5. 市場調査サマリー: 簡潔なサマリー
6. 市場適合スコア: [0-100]点

【出力形式】
HTS_KEYWORDS: [キーワード]
MATERIAL_RECOMMENDATION: [素材]
ORIGIN_COUNTRY_CANDIDATE: [国コード]
REWRITTEN_TITLE: [英語タイトル]
MARKET_SUMMARY: [サマリー]
MARKET_SCORE: [スコア]
```

---

### タスク2: API修正（HTS検索）

**ファイル**: `/app/api/products/hts-lookup/route.ts`

**修正内容**:
```typescript
// 現在のリクエストボディ
interface HtsLookupRequest {
  title_ja?: string;
  category?: string;
  brand?: string;
  keywords?: string;
}

// 👇 Gemini統合後
interface HtsLookupRequestV2 {
  // 既存フィールド
  title_ja?: string;
  category?: string;
  brand?: string;
  
  // Gemini出力フィールド（追加）
  hts_keywords: string;           // 必須
  material_recommendation?: string;
  origin_country_candidate?: string;
  market_score?: number;
  rewritten_title?: string;
  market_summary?: string;
}
```

**ロジック変更**:
1. `hts_keywords`を優先的にRPCに渡す
2. `material_recommendation` → `p_material_ja`にマッピング
3. 結果に`origin_country_hint`を含める

---

### タスク3: API修正（商品更新）

**ファイル**: `/app/api/products/update/route.ts`

**修正内容**:
```typescript
// Gemini統合フィールドをDBに保存
const updates = {
  ...existingUpdates,
  
  // Gemini出力を保存
  english_title: body.rewritten_title,
  material: body.material_recommendation,
  origin_country: body.origin_country_candidate?.split(',')[0], // 最初の候補
  
  // 市場調査データ
  market_research_summary: body.market_summary,
  market_score: body.market_score,
  
  // HTS学習データ
  hts_keywords: body.hts_keywords,
}

// record_hts_learning()を呼び出し
```

---

### タスク4: UIフィールド追加

**ファイル**: `/components/ProductModal/components/Tabs/TabEditing.tsx`（新規または既存修正）

**追加フィールド**:
```tsx
<div className="space-y-4">
  {/* Gemini出力フィールド */}
  <div>
    <label>HTSキーワード（Geminiから）</label>
    <input 
      name="hts_keywords" 
      placeholder="trading cards, collectible, pokemon"
    />
  </div>
  
  <div>
    <label>推奨素材</label>
    <input name="material_recommendation" />
  </div>
  
  <div>
    <label>原産国候補</label>
    <input name="origin_country_candidate" placeholder="JP,CN,US" />
  </div>
  
  <div>
    <label>リライト英語タイトル</label>
    <textarea name="rewritten_title" rows={2} />
  </div>
  
  <div>
    <label>市場調査サマリー</label>
    <textarea name="market_summary" rows={4} />
  </div>
  
  <div>
    <label>市場スコア</label>
    <input type="number" name="market_score" min="0" max="100" />
  </div>
  
  {/* HTS検索実行ボタン */}
  <button onClick={handleHTSLookup}>
    HTS検索実行
  </button>
</div>
```

---

### タスク5: データベーススキーマ更新

**ファイル**: 新規マイグレーション `/database/migrations/add_gemini_fields.sql`

```sql
-- Gemini統合フィールドを追加
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS hts_keywords TEXT,
ADD COLUMN IF NOT EXISTS market_research_summary TEXT,
ADD COLUMN IF NOT EXISTS market_score INTEGER CHECK (market_score >= 0 AND market_score <= 100);

-- インデックス追加（検索高速化）
CREATE INDEX IF NOT EXISTS idx_market_score ON products_master(market_score);

COMMENT ON COLUMN products_master.hts_keywords IS 'Gemini生成のHTSキーワード（カンマ区切り）';
COMMENT ON COLUMN products_master.market_research_summary IS 'Gemini生成の市場調査サマリー';
COMMENT ON COLUMN products_master.market_score IS 'Gemini生成の市場適合スコア（0-100）';
```

---

## 🔄 実装順序

1. ✅ **タスク5**: DBスキーマ更新（最優先）
2. ✅ **タスク1**: Geminiプロンプト仕様ドキュメント作成
3. ⏸️ **タスク2**: HTS検索API修正
4. ⏸️ **タスク3**: 商品更新API修正
5. ⏸️ **タスク4**: UIフィールド追加

---

## 🧪 テストシナリオ

### シナリオ1: Gemini出力をコピペ
1. ユーザーがGemini Web UIにプロンプトを貼り付け
2. Geminiが構造化データを返す
3. ユーザーがフィールドにコピペ
4. 「HTS検索実行」ボタンをクリック
5. HTSスコア・関税率が自動表示される

### シナリオ2: 学習データ蓄積
1. ユーザーがHTSコードを確定
2. 「保存」ボタンをクリック
3. `record_hts_learning()`が自動実行
4. 次回同じキーワードで検索時、学習済みスコア（900+）が返る

---

## 📊 期待される結果

### Before（現在）
- HTSスコア: 空白（❌）
- 関税率: 空白
- ユーザー操作: 手動でHTSコード入力

### After（実装後）
- HTSスコア: 300-900点（自動算出）
- 関税率: 自動表示
- ユーザー操作: Geminiからコピペ → 検索ボタン → 自動入力

---

## 🚨 注意事項

1. **キーワード品質が全て**: Geminiが生成する`hts_keywords`の精度がスコアに直結
2. **学習データの蓄積**: 初回は低スコアでも、確定後は900+点
3. **エラーハンドリング**: Gemini出力が不正な場合のフォールバック処理が必須

---

次のチャットでの作業開始コマンド:
```
「IMPLEMENTATION_PLAN_HTS_GEMINI.mdを読んで、
タスク5（DBスキーマ更新）から実装してください」
```
