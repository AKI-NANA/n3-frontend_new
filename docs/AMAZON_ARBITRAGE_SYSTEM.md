# 🚀 Amazon刈り取り自動化システム（Phase 1）

## 概要

このシステムは、Keepa波形分析とAI市場分析に基づき、Amazon US/JPから高スコア商品を自動で刈り取り、FBAを通じて素早く現金化するためのフルオートメーションツールです。

**売上目標**: 22億円達成のための最重要システム

## 主要機能

### 1. スコアリングエンジン（P-4戦略）

- **P-4戦略（市場枯渇予見）**: 最優先戦略
  - Amazon本体在庫枯渇 + メーカー終売 + 高需要（Keepaランキング）
  - スコア: 最大50点
- **P-1戦略（価格ミス）**: シャープな一時的下落
  - 現在価格が90日平均の70%未満
  - スコア: 最大40点
- **P-2戦略（寝かせ）**: 値上がり待機
  - メーカー終売 + 需要安定
  - スコア: 最大30点
- **AIリスク分析**: 需要崩壊・偽物リスクを自動除外

**自動決済閾値**: スコア85点以上

### 2. Keepa連携

- **Keepa Webhook**: 価格下落をトリガーとして自動決済を起動
- **波形分析**: P-1〜P-4戦略の検出
- **リアルタイムトラッキング**: 24時間体制で監視

### 3. 自動決済（Puppeteer）

- **アカウント分散**: 複数アカウントを使い分けてリスク最小化
- **IP分散**: プロキシを使用してアカウント停止リスクを回避
- **決済の自動化**: ログイン → カート追加 → 決済確定

⚠️ **セキュリティ注意事項**:
- カード情報はシステムに保存しない
- 認証情報は環境変数またはAWS Secrets Managerから取得
- ログには機密情報を記録しない

### 4. FBA納品自動化

- **SP-API連携**: Amazon SP-APIを使用して納品プラン作成
- **納品ラベル自動生成**: PDF形式でラベルを生成
- **自国完結型**: USで買ってUSで売る、JPで買ってJPで売る

### 5. 多販路自動出品

検品承認後、以下の販路へ自動出品:
- Amazon FBA（自国）
- eBay（オプション）
- 楽天・Yahoo!（JP商品のみ、オプション）

## システムアーキテクチャ

```
[Keepa API] → [Webhook] → [スコアリング] → [自動決済] → [FBA納品] → [多販路出品]
                              ↓
                        [AI分析でリスク判定]
                              ↓
                        [アカウント分散管理]
```

## ファイル構成

```
/home/user/n3-frontend_new/
├── types/
│   └── product.ts                              # 型定義（拡張済み）
├── lib/
│   ├── research/
│   │   └── scorer.ts                           # スコアリングエンジン
│   └── arbitrage/
│       └── account-manager.ts                  # アカウント管理
├── app/
│   ├── api/
│   │   ├── arbitrage/
│   │   │   ├── webhook/keepa/route.ts         # Keepa Webhook
│   │   │   ├── execute-payment/route.ts       # 自動決済API
│   │   │   └── approve-listing/[id]/route.ts  # 承認・出品API
│   │   └── fba/
│   │       └── create-plan/route.ts            # FBA納品プラン作成
│   └── tools/
│       └── amazon-arbitrage/
│           └── page.tsx                         # メインUI
├── supabase/
│   └── migrations/
│       └── 20250121_add_arbitrage_columns.sql  # DBスキーマ拡張
└── docs/
    └── AMAZON_ARBITRAGE_SYSTEM.md              # このドキュメント
```

## データベーススキーマ

### products_master テーブル（拡張カラム）

| カラム名 | 型 | 説明 |
|---------|-----|------|
| `arbitrage_score` | NUMERIC(5,2) | スコア（0-100） |
| `keepa_data` | JSONB | Keepa価格履歴データ |
| `ai_arbitrage_assessment` | JSONB | AI分析結果 |
| `arbitrage_status` | TEXT | ステータス（in_research/tracked/purchased/awaiting_inspection/ready_to_list/listed） |
| `purchase_account_id` | TEXT | 購入アカウントID |
| `amazon_order_id` | TEXT | Amazon注文ID |
| `target_country` | TEXT | 対象国（US/JP） |
| `optimal_sales_channel` | TEXT | 最適販売ルート |
| `fba_shipment_plan_id` | TEXT | FBA納品プランID |
| `fba_label_pdf_url` | TEXT | FBA納品ラベルURL |
| `physical_inventory_count` | INTEGER | 物理在庫数 |
| `initial_purchased_quantity` | INTEGER | 初回購入数量 |
| `final_production_status` | TEXT | メーカー終売ステータス |
| `keepa_ranking_avg_90d` | NUMERIC(10,2) | Keepaランキング90日平均 |
| `amazon_inventory_status` | TEXT | Amazon在庫ステータス |
| `multi_market_inventory` | JSONB | 他市場在庫データ |
| `hold_recommendation` | BOOLEAN | 寝かせ推奨フラグ |

## セットアップ手順

### 1. データベースマイグレーション

```bash
# Supabaseダッシュボードで以下のSQLを実行
# /supabase/migrations/20250121_add_arbitrage_columns.sql
```

### 2. 環境変数の設定

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Keepa API
KEEPA_API_KEY=your_keepa_api_key

# Amazon SP-API（本番環境）
SP_API_CLIENT_ID=your_sp_api_client_id
SP_API_CLIENT_SECRET=your_sp_api_client_secret
SP_API_REFRESH_TOKEN=your_sp_api_refresh_token

# プロキシ設定（アカウント分散用）
PROXY_US_1_HOST=proxy-us-1.example.com
PROXY_US_1_PORT=8080
# ... 他のプロキシ設定
```

### 3. Puppeteerのインストール（本番環境）

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

### 4. Keepa Webhookの設定

1. Keepaダッシュボードにログイン
2. 「Tracking」→「Product Tracker」
3. Webhook URLを設定: `https://your-domain.com/api/arbitrage/webhook/keepa`
4. 通知条件を設定（価格下落時）

## 使用方法

### UIアクセス

```
https://your-domain.com/tools/amazon-arbitrage
```

### ワークフロー

1. **リサーチ**: 商品データ取得 → スコアリング → 高スコア商品を `tracked` に設定
2. **自動決済**: Keepa Webhook → 価格下落 → 自動決済 → `purchased` に更新
3. **検品**: 商品到着 → `awaiting_inspection` に更新 → UIで承認ボタンを押す
4. **出品**: 承認 → 多販路自動出品 → `listed` に更新

## APIエンドポイント

### Keepa Webhook
```
POST /api/arbitrage/webhook/keepa
Body: { asin, current_price, trigger_price, notification_type }
```

### 自動決済
```
POST /api/arbitrage/execute-payment
Body: { asin, quantity, trigger_source }
```

### FBA納品プラン作成
```
POST /api/fba/create-plan
Body: { asin, quantity, target_country }
```

### 承認・出品
```
POST /api/arbitrage/approve-listing/[id]
```

## リスク管理

### アカウント停止リスクの最小化

1. **アカウント分散**: 常に複数アカウントを使用
2. **IP分散**: プロキシを使用して異なるIPアドレスから購入
3. **クールダウン期間**: 各アカウントは使用後60分のクールダウン
4. **AIリスク除外**: 偽物リスク・需要崩壊リスクを自動除外

### 損失リスクの最小化

1. **P-3戦略の回避**: 緩やかな値崩れ商品を自動除外（-50点）
2. **再販リスク排除**: メーカー終売確認を必須条件に
3. **需要確実性の証明**: Keepaランキング90日平均を評価

## 開発ステータス

### Phase 1（現在）: US/JP自国完結型

- ✅ データベーススキーマ拡張
- ✅ 型定義拡張
- ✅ スコアリングエンジン（P-4戦略）
- ✅ Keepa Webhook API
- ✅ 自動決済API（モック実装）
- ✅ アカウント管理ロジック
- ✅ FBA納品プラン作成API（モック実装）
- ✅ 承認・出品API
- ✅ メインUI

### Phase 2（未来）: グローバル展開

- 🔲 他国への展開（UK, DE, FR, etc.）
- 🔲 国際転送ロジック
- 🔲 関税計算の統合
- 🔲 多通貨対応

## モック実装と本番実装の違い

現在の実装は**開発用モック**です。本番環境では以下を実装してください:

### 自動決済API（execute-payment/route.ts）
- ❌ モック: ランダムな注文IDを生成
- ✅ 本番: Puppeteerで実際のAmazon操作

### FBA納品プラン作成API（fba/create-plan/route.ts）
- ❌ モック: ダミーの納品プランIDを生成
- ✅ 本番: Amazon SP-APIの `createInboundShipmentPlan` を呼び出し

### アカウント管理（account-manager.ts）
- ❌ モック: メモリ内で状態管理
- ✅ 本番: データベースまたはRedisで永続化

### 認証情報の管理
- ❌ モック: ハードコーディング
- ✅ 本番: AWS Secrets Manager または環境変数

## トラブルシューティング

### 1. Keepa Webhookが動作しない

- Webhook URLが正しく設定されているか確認
- ファイアウォールでポート443が開いているか確認
- ログを確認: `console.log` 出力

### 2. 自動決済が失敗する

- Puppeteerが正しくインストールされているか確認
- プロキシ設定が正しいか確認
- Amazonのログイン認証情報が正しいか確認

### 3. FBA納品プランが作成できない

- Amazon SP-APIの認証情報が正しいか確認
- SP-APIのレートリミットに達していないか確認

## サポート

このシステムに関する質問や問題がある場合は、開発チームにお問い合わせください。

---

**最終更新**: 2025-01-21
**バージョン**: 1.0.0 (Phase 1)
**作成者**: Claude AI + N3 Development Team
