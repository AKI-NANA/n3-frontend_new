# 外注向けダッシュボード実装ドキュメント

## 概要

外注スタッフが迷うことなく、承認と最適な出品形式を決定できる統合UIを提供します。

## 実装された機能

### F-1: AI承認・出品形式決定ダッシュボード

**パス**: `/outsourcer/approval-dashboard`

**機能**:
- priority_scoreの降順で商品リストを表示
- Gemini判定結果表示（VERO、パテントトロール、危険物）
- 出品形式推奨表示（バリエーション、単品、セット）
- 出品形式選択プルダウンと承認ボタン
- 承認後、statusを'承認済'に更新し、自動出品キューに転送
- バリエーション推奨時のシリーズ追加指示文表示

**UI要件**:
1. 並べ替え表示: priority_scoreの降順
2. Gemini判定結果表示:
   - リスク判定: VERO、パテントトロール、危険物の該当/非該当をアイコンとカラーコードで表示
   - 出品形式推奨: バリエーション、単品、セットの推奨マーク表示
3. 出品形式選択と承認: プルダウン選択肢（単品/セット/バリエーション）と承認ボタン
4. 承認後の処理: DBのstatusを'承認済'に更新し、自動出品キューにデータ転送

### F-2: モール別出品制限/在庫管理ダッシュボード

**パス**: `/outsourcer/inventory-dashboard`

**機能**:
- Ebayカテゴリ制限管理
  - 出品上限（10,000件/50,000件枠）に対する現在の出品数をプログレスバーで表示
  - カテゴリーごとの出品数と残り許容枠を一覧表で表示
  - 50,000件枠の商品が10,000件枠に含まれていないことを明確に区分け
- 在庫管理サマリー
  - URLを複数行ペーストして一括登録できるテキストエリア
  - SKU、現在在庫数、最安値、次回チェック予定時刻を一覧で表示
  - 在庫切れまたは危険水準の商品を赤枠で強調表示

**UI要件**:
1. Ebayカテゴリ制限管理:
   - 枠表示: プログレスバーで出品状況を可視化
   - カテゴリー内訳: カテゴリーごとの詳細を一覧表示
   - 例外表示: 50,000件枠と10,000件枠を明確に区分
2. 在庫管理サマリー:
   - 一括登録エリア: URLを複数行ペースト可能
   - 在庫状況リスト: 詳細な在庫情報を表示
   - 在庫切れアラート: 危険水準の商品を強調

### F-3: VERO対策ダッシュボード

**パス**: `/outsourcer/vero-dashboard`

**機能**:
- VERO対象商品のみを表示
- 自動タイトル変更案の表示とコピー機能
- 出品指示の明確な提示
  - 新品/ブランド名なしのバリエーション出品
  - 中古出品（中古がある場合のみ）
- 商品ページ記載文言の自動追加設定確認チェックボックス

**UI要件**:
1. リスク商品専用セクション: VERO対象商品のみ表示
2. 自動タイトル変更案: Gemini生成のリスク回避タイトル案をコピー可能に
3. 出品指示: 2択を明確に指示
   - 新品/ブランド名なしのバリエーション出品
   - 中古出品（中古がある場合のみ）
4. 商品ページ記載文言: リスク回避のための定型文を自動追加する確認チェックボックス

## データベース構造

### products_master テーブルの追加カラム

```sql
-- 優先度とAI判定関連
priority_score NUMERIC(10,2)                    -- 優先度スコア
gemini_risk_assessment JSONB                    -- Geminiリスク判定結果
gemini_listing_format JSONB                     -- Gemini出品形式推奨
listing_format VARCHAR(50)                      -- 選択された出品形式

-- 承認関連
approved_at TIMESTAMP WITH TIME ZONE            -- 承認日時
rejected_at TIMESTAMP WITH TIME ZONE            -- 却下日時
rejection_reason TEXT                           -- 却下理由

-- VERO対策関連
vero_risk_level VARCHAR(20)                     -- VEROリスクレベル
vero_reason TEXT                                -- VEROリスク理由
suggested_title TEXT                            -- VERO対策用の提案タイトル
suggested_listing_type VARCHAR(50)              -- 提案出品タイプ
suggested_description_note TEXT                 -- 商品ページ記載文言
can_list_as_used BOOLEAN                        -- 中古出品が可能か
vero_mitigation_applied BOOLEAN                 -- VERO対策が適用されたか
description_vero_note TEXT                      -- 商品説明に追加されるVERO対策文言
listing_type VARCHAR(50)                        -- 出品タイプ
original_title TEXT                             -- 元のタイトル
brand_name VARCHAR(255)                         -- ブランド名
```

### listing_queue テーブル

自動出品キュー。承認された商品が自動的に登録される。

```sql
CREATE TABLE listing_queue (
    id UUID PRIMARY KEY,
    product_id UUID REFERENCES products_master(id),
    sku VARCHAR(255) NOT NULL,
    listing_format VARCHAR(50),                 -- single/bundle/variation
    listing_type VARCHAR(50),
    vero_safe BOOLEAN DEFAULT FALSE,
    priority NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'queued',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE
);
```

### ebay_category_limits テーブル

Ebayカテゴリ別の出品制限を管理。

```sql
CREATE TABLE ebay_category_limits (
    id UUID PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL,
    category_id VARCHAR(100) NOT NULL,
    current_count INTEGER DEFAULT 0,
    limit_count INTEGER NOT NULL,
    is_50k_tier BOOLEAN DEFAULT FALSE,          -- 50,000件枠かどうか
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### inventory_monitoring テーブル

在庫監視対象商品を管理。

```sql
CREATE TABLE inventory_monitoring (
    id UUID PRIMARY KEY,
    sku VARCHAR(255),
    product_url TEXT NOT NULL,
    current_stock INTEGER,
    min_stock_threshold INTEGER DEFAULT 5,
    max_stock_threshold INTEGER DEFAULT 100,
    lowest_price NUMERIC(10,2),
    competitor_count INTEGER DEFAULT 0,
    last_check_at TIMESTAMP WITH TIME ZONE,
    next_check_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',       -- in_stock/low_stock/out_of_stock
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## セットアップ手順

### 1. データベースマイグレーション

```bash
# Supabase CLIを使用してマイグレーションを実行
supabase db push

# または、SQLファイルを直接実行
psql -U postgres -d your_database -f supabase/migrations/20250121_outsourcer_dashboards.sql
```

### 2. 環境変数の確認

`.env.local` に以下の環境変数が設定されていることを確認してください：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. アプリケーションの起動

```bash
npm run dev
```

### 4. ダッシュボードへのアクセス

- **AI承認ダッシュボード**: http://localhost:3000/outsourcer/approval-dashboard
- **在庫管理ダッシュボード**: http://localhost:3000/outsourcer/inventory-dashboard
- **VERO対策ダッシュボード**: http://localhost:3000/outsourcer/vero-dashboard

## 使用方法

### AI承認ダッシュボード

1. ダッシュボードにアクセスすると、priority_score順に商品が表示されます
2. 各商品カードで以下を確認：
   - リスク判定（VERO、パテントトロール、危険物）
   - AI推奨の出品形式
   - バリエーション推奨の場合のシリーズ提案
3. 出品形式を選択（プルダウン）
4. 「承認」ボタンをクリックして承認
5. 承認後、商品は自動的に出品キューに登録されます

### 在庫管理ダッシュボード

1. **Ebay出品制限の確認**:
   - プログレスバーで現在の出品状況を確認
   - カテゴリー内訳で詳細を確認
   - 10,000件枠と50,000件枠を区別して確認

2. **在庫監視の登録**:
   - URLを複数行ペーストして一括登録
   - 登録後、自動的に在庫状況の監視が開始されます

3. **在庫状況の確認**:
   - 在庫切れや在庫少の商品を確認
   - 最安値や競合数を確認
   - 次回チェック予定時刻を確認

### VERO対策ダッシュボード

1. VERO対象商品のみが表示されます
2. 各商品で以下を確認：
   - 元のタイトル
   - VEROリスク理由
   - AIが生成したリスク回避タイトル案
   - 推奨される出品方法
3. タイトル案や説明文をコピー
4. 商品ページ記載文言がある場合、チェックボックスで確認
5. 「VERO対策を適用して承認」ボタンをクリック

## データフロー

```
商品登録
  ↓
Gemini AI分析
  ↓
products_master (priority_score, gemini_risk_assessment, gemini_listing_format を設定)
  ↓
AI承認ダッシュボード (外注スタッフが確認・承認)
  ↓
listing_queue (承認された商品が自動登録)
  ↓
自動出品処理
```

## トラブルシューティング

### データが表示されない場合

1. Supabase接続を確認
2. products_masterテーブルに`approval_status`が`pending`または`under_review`のデータが存在することを確認
3. ブラウザのコンソールでエラーを確認

### 承認が失敗する場合

1. Supabaseの接続とアクセス権限を確認
2. listing_queueテーブルが存在することを確認
3. products_masterテーブルに必要なカラムが存在することを確認

### VEROダッシュボードに商品が表示されない場合

1. products_masterテーブルの`vero_risk_level`が`high`に設定されているデータが存在することを確認
2. `approval_status`が`pending`または`under_review`であることを確認

## 今後の拡張

- [ ] 一括承認機能の追加
- [ ] ダッシュボードのフィルタリング機能の強化
- [ ] リアルタイム通知機能
- [ ] 統計レポート機能
- [ ] モバイル対応の最適化

## ライセンス

社内利用のみ。外部への配布禁止。
