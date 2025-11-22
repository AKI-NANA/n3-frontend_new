# 💰 企業案件（タイアップ）獲得自動化システム

## 📋 概要

このシステムは、AI自動生成されたコンテンツを「特定の分野で影響力を持つペルソナによるメディア」として位置づけ、企業案件を自動で獲得するための包括的なソリューションです。

## 🎯 主要機能

### 1. 影響力証明（トラフィック・エンゲージメント自動集積）

各サイトのパフォーマンス指標を自動で収集し、企業への提案用の影響力証明データを生成します。

**対応プラットフォーム:**
- ブログ（Google Analytics）
- YouTube（YouTube Data API）
- TikTok（TikTok API）
- X（X API）
- Note
- Podcast

**API:**
- `POST /api/b2b/influence-proof/generate` - 影響力証明データを生成
- `POST /api/b2b/metrics/update` - メトリクスを自動更新

### 2. 企業リード生成

商品カテゴリやペルソナの専門分野に基づき、親和性の高いタイアップ候補企業を自動でリサーチします。

**機能:**
- 企業ウェブサイトのスクレイピング
- 会社概要、事業内容、最近のキャンペーン情報の抽出
- コンタクト情報の収集
- ペルソナとの親和性スコア計算（0-100点）

**API:**
- `POST /api/b2b/research-company` - 企業情報をリサーチ

### 3. 企画書自動生成（Gemini Pro使用）

Gemini Proが企業の最新の広告キャンペーンを分析し、ペルソナの強みと企業商品に合わせた具体的なタイアップ企画案を自動生成します。

**生成内容:**
- 提案タイトル
- 提案概要
- プラットフォーム別企画（TikTok、YouTube、ブログ等）
- 推定リーチ・エンゲージメント・コンバージョン
- 提案価格
- 企業へのメリット
- 成果物リスト
- スケジュール

**API:**
- `POST /api/b2b/generate-proposal` - 提案書を自動生成

### 4. 提案メール自動送信

生成された企画書を添付し、ターゲット企業のマーケティング担当者宛に提案メールを自動送信します。

**機能:**
- HTML形式の美しいメールテンプレート
- Resend APIを使用した確実な配信
- アウトリーチログの自動記録
- フォローアップメールの自動スケジュール

**API:**
- `POST /api/b2b/send-outreach` - アウトリーチメールを送信

## 🗂️ データベーススキーマ

### テーブル一覧

#### 1. `persona_master` - ペルソナマスター

AI生成コンテンツの発信者ペルソナを管理

```sql
CREATE TABLE persona_master (
  id UUID PRIMARY KEY,
  persona_name VARCHAR(255) UNIQUE NOT NULL,
  persona_type VARCHAR(50) NOT NULL, -- 'fictional', 'real', 'brand'
  tone_and_voice TEXT,
  expertise_areas TEXT[],
  unique_selling_points TEXT[],
  total_reach BIGINT DEFAULT 0,
  email VARCHAR(255),
  bio TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. `site_config_master` - サイト設定マスター

運営する全サイトの設定とパフォーマンス指標を管理

```sql
CREATE TABLE site_config_master (
  id UUID PRIMARY KEY,
  site_name VARCHAR(255) NOT NULL,
  site_url VARCHAR(500) UNIQUE NOT NULL,
  site_type VARCHAR(50) NOT NULL, -- 'blog', 'youtube', 'tiktok', 'note', 'x', 'podcast'
  persona_id UUID REFERENCES persona_master(id),
  category VARCHAR(100),
  target_audience VARCHAR(100),
  metrics JSONB DEFAULT '{}'::jsonb,
  api_credentials JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'active',
  last_metrics_update TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. `partnership_proposals` - 提案書マスター

AI生成された企業タイアップの提案書を管理

```sql
CREATE TABLE partnership_proposals (
  id UUID PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  persona_id UUID REFERENCES persona_master(id),
  target_company VARCHAR(255) NOT NULL,
  target_product VARCHAR(255),
  proposal_type VARCHAR(50) DEFAULT 'sponsored_content',
  proposal_summary TEXT NOT NULL,
  platform_plans JSONB DEFAULT '{}'::jsonb,
  estimated_reach BIGINT,
  estimated_engagement BIGINT,
  estimated_conversions INTEGER,
  proposed_price_jpy DECIMAL(15, 2),
  influence_proof JSONB DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt_used TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. `outreach_log_master` - アウトリーチログ

企業へのコンタクト履歴と進捗を管理

```sql
CREATE TABLE outreach_log_master (
  id UUID PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  proposal_id UUID REFERENCES partnership_proposals(id),
  persona_id UUID REFERENCES persona_master(id),
  outreach_date TIMESTAMPTZ DEFAULT now(),
  outreach_type VARCHAR(50) DEFAULT 'email',
  email_subject VARCHAR(500),
  status VARCHAR(50) DEFAULT 'sent',
  response_date TIMESTAMPTZ,
  partnership_value_jpy DECIMAL(15, 2),
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence_score DECIMAL(5, 2),
  follow_up_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 🚀 セットアップ

### 1. データベースマイグレーション

```bash
# Supabase CLIを使用してマイグレーションを実行
psql -h <your-supabase-host> -U postgres -d postgres -f database/migrations/008_create_b2b_partnership_tables.sql
```

または、SupabaseダッシュボードのSQL Editorで直接実行。

### 2. 環境変数の設定

`.env.local` に以下を追加：

```bash
# AI
GEMINI_API_KEY=your_gemini_api_key

# メール送信（Resend）
RESEND_API_KEY=your_resend_api_key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# データベース
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Analytics API（オプション）
GOOGLE_ANALYTICS_CLIENT_EMAIL=your_client_email
GOOGLE_ANALYTICS_PRIVATE_KEY=your_private_key

# YouTube Data API（オプション）
YOUTUBE_API_KEY=your_youtube_api_key

# X API（オプション）
X_API_KEY=your_x_api_key
X_API_SECRET=your_x_api_secret
```

### 3. サンプルデータの投入

マイグレーションファイル内のサンプルデータが自動で投入されます：
- ペルソナ: 「AI美容マニアのミキ」
- サイト: 「AI美容マニア｜最新コスメレビュー」

## 📖 使い方

### 1. ペルソナを作成

```typescript
import { createPersona } from '@/lib/supabase/b2b-partnership';

const persona = await createPersona({
  persona_name: 'AI美容マニアのミキ',
  persona_type: 'fictional',
  tone_and_voice: '明るく親しみやすい口調',
  expertise_areas: ['美容', 'コスメ', 'スキンケア'],
  unique_selling_points: [
    '月間10万PV美容ブログ運営',
    'TikTok 5万フォロワー',
  ],
  email: 'miki@example.com',
  bio: 'AIが生成する最新美容トレンド情報を発信。',
});
```

### 2. サイトを登録

```typescript
import { createSite } from '@/lib/supabase/b2b-partnership';

const site = await createSite({
  site_name: 'AI美容マニア｜最新コスメレビュー',
  site_url: 'https://ai-beauty-mania.example.com',
  site_type: 'blog',
  persona_id: persona.id,
  category: '美容',
  target_audience: 'F1層（20-34歳女性）',
  metrics: {
    monthly_visitors: 100000,
    monthly_pageviews: 250000,
    avg_engagement_rate: 4.5,
  },
});
```

### 3. メトリクスを更新

```bash
curl -X POST http://localhost:3000/api/b2b/metrics/update \
  -H "Content-Type: application/json" \
  -d '{"persona_id": "uuid-here", "force_update": true}'
```

### 4. 影響力証明データを生成

```bash
curl -X POST http://localhost:3000/api/b2b/influence-proof/generate \
  -H "Content-Type: application/json" \
  -d '{"persona_id": "uuid-here"}'
```

### 5. 企業をリサーチ

```bash
curl -X POST http://localhost:3000/api/b2b/research-company \
  -H "Content-Type: application/json" \
  -d '{
    "company_url": "https://example-cosmetics.com",
    "persona_id": "uuid-here"
  }'
```

### 6. 提案書を生成

```bash
curl -X POST http://localhost:3000/api/b2b/generate-proposal \
  -H "Content-Type: application/json" \
  -d '{
    "persona_id": "uuid-here",
    "company_data": {
      "company_name": "Example Cosmetics",
      "industry": "化粧品",
      "description": "最新のスキンケア商品を開発・販売"
    },
    "target_product": "新発売の美容液"
  }'
```

### 7. 提案メールを送信

```bash
curl -X POST http://localhost:3000/api/b2b/send-outreach \
  -H "Content-Type: application/json" \
  -d '{
    "proposal_id": "uuid-here",
    "contact_email": "marketing@example-cosmetics.com",
    "contact_person": "山田太郎",
    "company_name": "Example Cosmetics"
  }'
```

## 🎨 管理ダッシュボード

管理UIにアクセス:

```
http://localhost:3000/tools/b2b-partnership
```

**機能:**
- ペルソナ管理
- サイト管理
- 提案書一覧
- アウトリーチログ
- 統計情報（送信数、返信率、成約率等）

## 📊 統計・分析

### アウトリーチ統計を取得

```typescript
import { getOutreachStatistics } from '@/lib/supabase/b2b-partnership';

const stats = await getOutreachStatistics(personaId);

console.log(stats);
// {
//   total_sent: 50,
//   total_replied: 10,
//   total_accepted: 3,
//   response_rate: 20.0,
//   acceptance_rate: 30.0,
//   total_value_jpy: 1500000,
//   avg_value_jpy: 500000
// }
```

### ペルソナのメトリクス集計

```typescript
import { aggregatePersonaMetrics } from '@/lib/supabase/b2b-partnership';

const metrics = await aggregatePersonaMetrics(personaId);

console.log(metrics);
// {
//   total_followers: 65000,
//   total_monthly_visitors: 120000,
//   avg_engagement_rate: 5.2,
//   platforms: ['blog', 'youtube', 'tiktok']
// }
```

## 🔄 今後の拡張予定

### フェーズ2: 実際のAPI統合

- [ ] Google Analytics API統合（ブログトラフィック取得）
- [ ] YouTube Data API統合（チャンネル統計取得）
- [ ] TikTok API統合（フォロワー・エンゲージメント取得）
- [ ] X API統合（フォロワー・エンゲージメント取得）

### フェーズ3: 高度な自動化

- [ ] 企業ウェブサイトの実際のスクレイピング実装（Puppeteer）
- [ ] 自動フォローアップメールスケジューラー
- [ ] 開封率・クリック率のトラッキング
- [ ] A/Bテスト機能（複数の提案パターン）
- [ ] CRMシステムとの統合

### フェーズ4: マルチプラットフォーム集積管理

- [ ] ブログ → X/Note 自動連動投稿
- [ ] YouTube → Note/Blog 文字起こし自動投稿
- [ ] Podcast完全自動化（記事 → 音声変換 → RSSフィード生成）

## 🛠️ トラブルシューティング

### メールが送信されない

- `RESEND_API_KEY` が正しく設定されているか確認
- Resendダッシュボードでドメイン認証が完了しているか確認
- 送信元メールアドレス（`DEFAULT_FROM_EMAIL`）が認証済みドメインか確認

### メトリクス更新が機能しない

現在はモックデータを使用しています。実際のAPI統合は今後実装予定です。

### Geminiでエラーが発生する

- `GEMINI_API_KEY` が正しく設定されているか確認
- Gemini API の利用制限に達していないか確認
- プロンプトが長すぎる場合は、企業情報や影響力証明データを簡略化

## 📝 ライセンス

このプロジェクトは MIT License の下で公開されています。

## 🤝 貢献

バグ報告や機能リクエストは、GitHub Issues でお願いします。
