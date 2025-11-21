# Amazonリサーチ戦略的データ選定エンジン

## 📋 概要

Amazonの膨大なデータの中から、手動のキーワード検索に頼らず、**「新品」「高利益率」「ニッチカテゴリー」**など、設定された条件に合致するASINを自動で選定し、継続的なAPI更新キューに投入するエンジンです。

## 🎯 主な機能

### 1. 🥇 資産の保護（有在庫品・高スコア品）

最優先の選定ロジックです。既に仕入れ済み、または将来性が高いと判断されたSKUのデータ鮮度を維持します。

- **有在庫品の更新**: SKUマスターに登録済みのASINを最優先で更新
- **高スコア品の継続監視**: 過去にU_iスコアが一定値以上（例: 5,000点）を記録したASINを監視

### 2. 🥈 市場の開拓（新規・特定の条件）

新規でリサーチすべき、利益率が高くなる可能性のあるニッチな商品を探し出します。

- **新規出品の監視**: 発売日やAmazonの出品開始日が直近30日以内のASIN
- **特定カテゴリーの監視**: ユーザーが設定した特定のカテゴリーID（例: トレーディングカード）に属するASIN
- **キーワード監視**: 利益率が高いと予想されるニッチなワードに一致する商品
- **価格帯フィルタ**: 高価格帯（例: 10,000円以上）やニッチな低価格帯など、ユーザーが設定した価格範囲に属するASIN

### 3. 🥉 競合の追跡（外部データとの連携）

他モールでの成功や、特定の競合セラーの動向からASINを選定します。

- **eBay Sold実績追跡**: 外部のeBayリサーチデータと照合し、Sold実績のある商品と同じASIN
- **競合セラーの監視**: ユーザーが指定したAmazonの優良セラーIDが出品しているASIN

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                   UI (Amazonリサーチツール)                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────────────┐    │
│  │ 商品検索   │  │ 戦略設定   │  │ キュー管理         │    │
│  └───────────┘  └───────────┘  └───────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    API エンドポイント                       │
│  ┌──────────────────┐  ┌──────────────────────────┐     │
│  │ /api/amazon/     │  │ /api/amazon/queue        │     │
│  │ strategy/config  │  │ - GET: 統計・一覧取得     │     │
│  │ - GET: 設定取得  │  │ - POST: ASIN追加         │     │
│  │ - POST: 設定保存 │  │ - DELETE: クリア/リセット │     │
│  └──────────────────┘  └──────────────────────────┘     │
│  ┌──────────────────┐  ┌──────────────────────────┐     │
│  │ /api/amazon/     │  │ /api/amazon/queue/       │     │
│  │ strategy/execute │  │ process                  │     │
│  │ - POST: 手動実行 │  │ - POST: プロセッサー起動 │     │
│  └──────────────────┘  └──────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   コアエンジン                             │
│  ┌────────────────────────────────────────────────┐     │
│  │ AsinSelectionEngine (ASIN選定エンジン)          │     │
│  │ - 資産の保護: 有在庫品・高スコア品の選定        │     │
│  │ - 市場の開拓: 新規・カテゴリー・キーワード選定   │     │
│  │ - 競合の追跡: 競合セラー・eBay Sold選定        │     │
│  │ - 優先度ソート・重複排除                       │     │
│  └────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────┐     │
│  │ QueueProcessor (キュープロセッサー)             │     │
│  │ - キューからASINを取り出し                      │     │
│  │ - Amazon APIでデータ取得                       │     │
│  │ - アダプティブ遅延処理（レートリミット対策）     │     │
│  │ - リトライ処理・エラーハンドリング              │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  データベース (Supabase)                   │
│  ┌──────────────────────┐  ┌─────────────────────┐     │
│  │ amazon_research_     │  │ amazon_update_queue │     │
│  │ strategies           │  │ - ASIN              │     │
│  │ - 戦略設定           │  │ - ソース            │     │
│  │ - 優先度・条件       │  │ - 優先度・ステータス │     │
│  └──────────────────────┘  └─────────────────────┘     │
│  ┌──────────────────────┐  ┌─────────────────────┐     │
│  │ amazon_products      │  │ sku_master          │     │
│  │ - ASIN               │  │ - 有在庫品情報      │     │
│  │ - 商品情報           │  │                     │     │
│  │ - 利益スコア         │  │                     │     │
│  └──────────────────────┘  └─────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 📁 ファイル構成

```
/types
  └── amazon-strategy.ts                    # 型定義

/lib/amazon
  ├── asin-selection-engine.ts             # ASIN選定エンジン
  ├── queue-processor.ts                   # キュープロセッサー
  └── amazon-api-client.ts                 # Amazon API クライアント（既存）

/app/api/amazon
  ├── strategy
  │   ├── config/route.ts                  # 戦略設定API
  │   └── execute/route.ts                 # 戦略実行API
  └── queue
      ├── route.ts                         # キュー管理API
      └── process/route.ts                 # キュープロセッサー実行API

/app/tools/amazon-research
  └── page.tsx                             # Amazonリサーチツール（拡張版）

/components/amazon
  ├── StrategyConfigPanel.tsx              # 戦略設定パネル
  └── QueueManagementPanel.tsx             # キュー管理パネル

/supabase/migrations
  └── 20250121_amazon_strategy_tables.sql  # データベースマイグレーション
```

## 🚀 セットアップ手順

### 1. データベースマイグレーション

Supabaseダッシュボードで以下のSQLを実行してください：

```bash
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/20250121_amazon_strategy_tables.sql
```

または、Supabase CLIを使用：

```bash
supabase db push
```

### 2. 環境変数の設定

`.env.local` ファイルに以下を追加：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. 依存パッケージのインストール

```bash
npm install
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

## 💻 使用方法

### UI経由での設定

1. **Amazonリサーチツールにアクセス**
   - `http://localhost:3000/tools/amazon-research` にアクセス

2. **「戦略設定」タブを開く**
   - 3つの戦略（資産の保護、市場の開拓、競合の追跡）を設定

3. **設定を保存**
   - 「保存」ボタンをクリックして設定を保存

4. **戦略を実行**
   - 「今すぐ実行」ボタンをクリックして手動実行
   - または、定期的に自動実行（VPS上のバッチ処理として実装）

5. **キュー管理**
   - 「キュー管理」タブでキューの状態を監視
   - 完了済みアイテムのクリア、失敗アイテムのリセットが可能

### API経由での実行

#### 戦略設定の取得

```bash
curl -X GET http://localhost:3000/api/amazon/strategy/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 戦略設定の保存

```bash
curl -X POST http://localhost:3000/api/amazon/strategy/config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enable_inventory_protection": true,
    "min_profit_score_threshold": 5000,
    "enable_new_products": true,
    "new_products_days": 30,
    "monitor_keywords": ["トレーディングカード", "限定品"],
    "price_range_min": 10000,
    "price_range_max": 50000,
    "execution_frequency": "daily",
    "max_asins_per_execution": 100,
    "is_active": true
  }'
```

#### 戦略の実行

```bash
curl -X POST http://localhost:3000/api/amazon/strategy/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### キュー統計の取得

```bash
curl -X GET http://localhost:3000/api/amazon/queue?action=stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### キュープロセッサーの起動

```bash
curl -X POST http://localhost:3000/api/amazon/queue/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchSize": 10,
    "maxProcessingTime": 3600000
  }'
```

## ⚙️ アダプティブ遅延処理

キュープロセッサーは、Amazon APIのレートリミットを回避するために、アダプティブ遅延処理を実装しています：

- **初期遅延**: 5秒
- **最小遅延**: 5秒
- **最大遅延**: 60秒

### 動作仕組み

1. **成功時**: 遅延を10%減少（最小遅延まで）
2. **エラー発生時（3回連続）**: 遅延を2倍に増加（最大遅延まで）
3. **5回連続エラー**: 60秒間の一時停止

この仕組みにより、APIレートリミットを超えることなく、効率的にデータを取得できます。

## 🔄 VPS上でのバッチ処理（推奨）

本番環境では、VPS上でバッチ処理として実行することを推奨します：

### Node.jsスクリプト例

```javascript
// scripts/amazon-strategy-batch.js
import { AsinSelectionEngine } from '../lib/amazon/asin-selection-engine.js'
import { QueueProcessor } from '../lib/amazon/queue-processor.js'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function runBatch() {
  console.log('Starting Amazon strategy batch process...')

  // 全ユーザーの有効な戦略を取得
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: strategies } = await supabase
    .from('amazon_research_strategies')
    .select('*')
    .eq('is_active', true)

  // 各戦略を実行
  const engine = new AsinSelectionEngine(supabaseUrl, supabaseKey)
  for (const strategy of strategies) {
    console.log(`Executing strategy for user: ${strategy.user_id}`)
    const result = await engine.executeStrategy(strategy, strategy.user_id)
    console.log(`Result: ${result.asins_queued} ASINs queued`)
  }

  // キュープロセッサーを起動
  console.log('Starting queue processor...')
  const processor = new QueueProcessor(supabaseUrl, supabaseKey)
  await processor.startProcessing({ batchSize: 20, maxProcessingTime: 7200000 }) // 2時間

  console.log('Batch process completed')
}

runBatch().catch(console.error)
```

### Cronジョブの設定

```bash
# 毎日午前2時に実行
0 2 * * * cd /path/to/project && node scripts/amazon-strategy-batch.js >> /var/log/amazon-batch.log 2>&1
```

## 📊 監視とメトリクス

### キュー統計

- **全体数**: キューに追加された総ASIN数
- **待機中**: ペンディング状態のASIN数
- **処理中**: 現在処理中のASIN数
- **完了**: 正常に処理されたASIN数
- **失敗**: エラーで失敗したASIN数
- **平均処理時間**: 1ASINあたりの平均処理時間

### ソース別内訳

各戦略でどれだけのASINが選定されたかを追跡：
- inventory_protection
- high_score
- new_product
- category
- keyword
- competitor
- ebay_sold

## 🛠️ トラブルシューティング

### キューが処理されない

1. キュープロセッサーが起動しているか確認
2. APIエラーログを確認
3. Amazon APIキーが有効か確認

### 戦略が実行されない

1. 戦略が有効化されているか確認（`is_active = true`）
2. 設定値が正しいか確認（例: `max_asins_per_execution > 0`）

### ASINが重複してキューに追加される

- 重複排除ロジックは実装済みですが、同時実行による競合が発生する可能性があります
- キュープロセッサーを1つのインスタンスで実行することを推奨

## 🔐 セキュリティ

- **Row Level Security (RLS)**: Supabaseのポリシーで各ユーザーのデータを保護
- **認証**: 全APIエンドポイントで認証が必要
- **サービスロールキー**: キュープロセッサーでのみ使用、安全に管理してください

## 📝 今後の拡張

- [ ] Webhookによる価格変動の即時検知
- [ ] Keepaデータとの統合
- [ ] AIによるASIN選定の最適化
- [ ] リアルタイムダッシュボード
- [ ] Slackへの通知機能

## 📞 サポート

質問や問題がある場合は、以下までお問い合わせください：
- GitHub Issues
- Email: support@example.com
