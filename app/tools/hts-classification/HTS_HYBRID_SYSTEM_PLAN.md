# HTS分類ハイブリッドシステム 実装計画書

## 📋 概要

既存のHTS特定ツールを、DB強化（Geminiが担当）と高度なロジック連携により、自動特定精度と人間による確認の効率性を最大化する「ハイブリッド分類システム」へ進化させる。

## 🎯 6段階の分類フロー

### Phase 0: データ前処理
- 商品データ（タイトル、説明文、カテゴリー）の正規化
- 全角→半角変換、不要記号除去
- L2/L4決定ロジック（材質・素材キーワード検出による事前絞り込み）

### Phase 1: 優先特定（高信頼度データ）
**目的**: 完全一致する過去実績から即座に特定

**実装内容**:
- 商品タイトルの完全一致検索
- JAN/UPCコードによる特定
- 信頼度: 99%以上

**データベーステーブル**:
```sql
CREATE TABLE hts_priority_mappings (
  id BIGSERIAL PRIMARY KEY,
  product_title TEXT NOT NULL,
  jan_code TEXT,
  upc_code TEXT,
  hts_code TEXT NOT NULL,
  confidence_score DECIMAL(5,4) DEFAULT 0.99,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 2: DB特定（キーワード・カテゴリー）
**目的**: キーワードマッチングによる特定

**実装内容**:
- 商品説明文からキーワード抽出
- カテゴリーマスターとの照合
- 材質・素材による絞り込み

**データベーステーブル**:
```sql
CREATE TABLE hts_keyword_mappings (
  id BIGSERIAL PRIMARY KEY,
  keyword TEXT NOT NULL,
  category TEXT,
  material TEXT,
  hts_code TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  confidence_score DECIMAL(5,4) DEFAULT 0.85,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_keyword ON hts_keyword_mappings(keyword);
CREATE INDEX idx_category ON hts_keyword_mappings(category);
```

### Phase 3: 過去実績参照（エンベッディング）
**目的**: 意味的類似度による特定

**実装内容**:
- 商品タイトル・説明文のエンベッディングベクトル化
- pgvectorによる類似度検索
- 閾値: 0.80以上

**データベーステーブル**:
```sql
-- pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE hts_embedding_history (
  id BIGSERIAL PRIMARY KEY,
  product_title TEXT NOT NULL,
  product_description TEXT,
  hts_code TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small
  human_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON hts_embedding_history 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

**実装ステップ**:
1. Gemini Embeddings APIまたはOpenAI Embeddings APIで商品情報をベクトル化
2. Supabaseのpgvector拡張で類似度検索
3. スコア0.80以上の結果を候補として返す

### Phase 4: AI介入（Gemini API）
**目的**: 機械学習による最終候補提示

**実装内容**:
- Gemini 2.5 Flash API連携
- バッチ処理（最大50件/リクエスト）
- 構造化出力（JSONスキーマ）

**APIエンドポイント**:
```typescript
// lib/gemini/hts-classifier.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface HTSClassificationResult {
  id: number;
  htsCode: string;
  reason: string;
  confidence: number;
}

export async function batchClassifyWithGemini(products: Array<{
  id: number;
  title: string;
  description: string;
  category?: string;
}>) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-preview-09-2025",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "number" },
            htsCode: { type: "string" },
            reason: { type: "string" },
            confidence: { type: "number" }
          }
        }
      }
    }
  });

  const prompt = `以下の商品のHTSコードを特定してください...`;
  
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text()) as HTSClassificationResult[];
}
```

### Phase 5: 品質チェック（関税率チェック）
**目的**: ビジネスリスク検証

**実装内容**:
- 暫定HTSコードの関税率取得
- 類似商品の関税率との差分計算
- 閾値（5%）超過時にフラグ設定

**リスク評価ロジック**:
```typescript
// lib/hts/risk-analyzer.ts
export async function analyzeHTSRisk(
  proposedHTS: string,
  productTitle: string,
  productCategory: string
) {
  // 1. 提案されたHTSコードの関税率を取得
  const proposedTariff = await getTariffRate(proposedHTS);
  
  // 2. 類似商品で異なるHTSコードが使われた事例を検索
  const similarProducts = await findSimilarProducts(productTitle, productCategory);
  
  // 3. 関税率の差分を計算
  const risks = similarProducts.map(product => ({
    htsCode: product.hts_code,
    tariffRate: product.tariff_rate,
    difference: Math.abs(proposedTariff - product.tariff_rate),
    isHighRisk: Math.abs(proposedTariff - product.tariff_rate) > 5.0
  }));
  
  return {
    proposedHTS,
    proposedTariff,
    similarProducts: risks,
    requiresReview: risks.some(r => r.isHighRisk)
  };
}
```

**データベーステーブル**:
```sql
CREATE TABLE hts_classification_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT,
  product_title TEXT NOT NULL,
  proposed_hts_code TEXT NOT NULL,
  proposed_tariff_rate DECIMAL(5,2),
  phase_completed TEXT, -- 'priority', 'keyword', 'embedding', 'ai'
  confidence_score DECIMAL(5,4),
  requires_review BOOLEAN DEFAULT false,
  high_risk_flag BOOLEAN DEFAULT false,
  risk_reason TEXT,
  human_verified BOOLEAN DEFAULT false,
  final_hts_code TEXT,
  verified_by TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_product_id ON hts_classification_history(product_id);
CREATE INDEX idx_high_risk ON hts_classification_history(high_risk_flag);
```

### Phase 6: 人間確認（UI改善）
**目的**: 効率的な最終確認と学習データ蓄積

**実装内容**:
1. **優先度表示**
   - High Riskフラグ付きを最上位表示
   - 信頼度スコアでソート

2. **根拠の可視化**
   - マッチしたキーワード表示
   - 類似度スコア表示
   - 関税率比較結果表示

3. **ワンクリック学習登録**
   - 承認時に自動でエンベッディングDBへ登録
   - キーワードDBへの追加
   - 優先度マッピングへの登録

**UIコンポーネント**:
```tsx
// app/tools/hts-classification/review/page.tsx
export default function HTSReviewPage() {
  return (
    <div>
      {/* High Risk Items */}
      <section className="bg-red-50 border-red-500">
        <h2>⚠️ 要再確認（High Risk）</h2>
        {highRiskItems.map(item => (
          <HTSReviewCard 
            item={item}
            showRiskAnalysis={true}
            priority="high"
          />
        ))}
      </section>

      {/* Normal Items */}
      <section>
        <h2>通常確認項目</h2>
        {normalItems.map(item => (
          <HTSReviewCard 
            item={item}
            showRiskAnalysis={false}
            priority="normal"
          />
        ))}
      </section>
    </div>
  );
}
```

## 📊 データベース設計

### テーブル一覧
1. `hts_priority_mappings` - 優先特定用（完全一致）
2. `hts_keyword_mappings` - キーワード特定用
3. `hts_embedding_history` - エンベッディング検索用
4. `hts_classification_history` - 分類履歴（全フェーズ）
5. `hts_codes_details` - HTSコードマスター（既存）
6. `country_additional_tariffs` - 原産国別追加関税（既存）

### マイグレーションファイル
```sql
-- supabase/migrations/YYYYMMDD_hts_hybrid_system.sql
```

## 🚀 実装順序

### フェーズ1: 基本インフラ構築（1-2日）
- [ ] データベーステーブル作成
- [ ] pgvector拡張有効化
- [ ] 基本的なSupabase関数実装

### フェーズ2: Phase 1-2実装（2-3日）
- [ ] 優先特定ロジック
- [ ] キーワード特定ロジック
- [ ] 管理画面でのキーワード登録UI

### フェーズ3: Phase 3実装（3-4日）
- [ ] エンベッディングAPI統合
- [ ] ベクトル検索実装
- [ ] バッチ処理パイプライン

### フェーズ4: Phase 4実装（2-3日）
- [ ] Gemini API統合
- [ ] バッチ分類API
- [ ] エラーハンドリング・リトライロジック

### フェーズ5: Phase 5-6実装（3-4日）
- [ ] リスク分析ロジック
- [ ] レビューUI構築
- [ ] 学習データ登録フロー

### フェーズ6: テスト・最適化（2-3日）
- [ ] E2Eテスト
- [ ] パフォーマンス最適化
- [ ] ドキュメント整備

## 💡 技術スタック

- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **データベース**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini API, OpenAI Embeddings API
- **デプロイ**: Vercel

## 📈 期待される成果

1. **精度向上**: 手動特定時間を80%削減
2. **リスク低減**: 関税率の誤適用を95%削減
3. **学習効果**: 使用するほど精度が向上
4. **コスト削減**: AI APIコールを最小化（優先特定→AI介入の順）

## 🔄 次のステップ

1. Supabaseマイグレーションファイル作成
2. Phase 1-2の基本ロジック実装
3. 簡易的な管理画面構築
4. データ投入とテスト

---

**作成日**: 2025-11-07
**ステータス**: 計画段階 → 実装準備中
