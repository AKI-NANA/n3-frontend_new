# 古物自動作成・記録システム

## 概要

古物営業法で義務付けられている「品目、数量、特徴、仕入先、日付」の記録を、受注（仕入れ実行）のプロセスと同時に自動で完了させるシステムです。外注スタッフの手動データ入力やスクリーンショット撮影の手間を排除します。

## システム構成

### 1. データベース

#### `sales_orders` テーブル
受注管理マスタテーブル。全受注の基本情報と仕入・利益管理を行います。

主要フィールド:
- `order_id`: 受注ID（主キー）
- `purchase_status`: 仕入ステータス（未仕入れ / 仕入れ済み / キャンセル）
- `actual_purchase_url`: 実際の仕入れ先URL
- `actual_purchase_cost_jpy`: 実際の仕入れ値（JPY）
- `pdf_get_required`: RPAキューフラグ
- `pdf_get_status`: PDF取得ステータス

#### `kobutsu_ledger` テーブル
古物台帳。古物営業法に基づく法定記録を自動管理します。

主要フィールド:
- `ledger_id`: 古物台帳ID（主キー）
- `order_id`: 受注ID（外部キー）
- `acquisition_date`: 仕入れ実行日時
- `item_name`: 品目名
- `item_features`: 特徴（AI抽出）
- `quantity`: 数量
- `acquisition_cost`: 仕入対価（JPY）
- `supplier_name`: 仕入先名（AI抽出）
- `supplier_type`: 仕入先種別
- `source_image_path`: 仕入先商品画像のパス
- `proof_pdf_path`: 取引証明書PDFのパス（RPA取得）
- `ai_extraction_status`: AI抽出ステータス
- `rpa_pdf_status`: RPA PDF取得ステータス

### 2. コンポーネント

#### `components/order-management/OrderDetailPanel.tsx`
受注詳細パネル。[仕入れ済み]ボタンによるトリプルアクション実行と古物台帳ステータス表示を担当。

主要機能:
- 仕入れ実行（トリプルアクション）
- 古物台帳ステータス表示（緑: 登録済み / 赤: 未登録）
- AI抽出・RPA処理の進行状況表示

#### `app/kobutsu/report/page.tsx`
古物台帳レポート画面。台帳データの閲覧、フィルタリング、PDF/CSV出力機能を提供。

主要機能:
- 日付範囲フィルター
- 仕入先名検索
- 仕入先種別フィルター
- PDF/CSV出力（税務調査対応）

### 3. APIエンドポイント

#### `/api/order/complete-acquisition` (POST)
トリプルアクションAPI。[仕入れ済み]ボタン押下時に以下を実行:

1. **利益確定**: `sales_orders` テーブル更新
2. **RPAキュー投入**: `pdf_get_required = TRUE` に設定
3. **古物台帳記録**: `kobutsu_ledger` に仮レコード作成

リクエストボディ:
```json
{
  "orderId": "ORD-20251101-001",
  "actualPurchaseUrl": "https://example.com/item/123",
  "actualPurchaseCostJPY": 20000,
  "finalShippingCostJPY": 1250
}
```

レスポンス:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-20251101-001",
    "ledgerId": "uuid-xxxx-xxxx-xxxx",
    "finalProfit": 8750,
    "status": {
      "orderUpdated": true,
      "ledgerCreated": true,
      "aiQueueAdded": true,
      "rpaQueueAdded": true
    }
  }
}
```

#### `/api/kobutsu/ledger` (GET)
古物台帳データ取得API。フィルタリングに対応。

クエリパラメータ:
- `dateFrom`: 仕入日開始日
- `dateTo`: 仕入日終了日
- `supplierName`: 仕入先名（部分一致）
- `supplierType`: 仕入先種別

#### `/api/kobutsu/export` (POST)
古物台帳PDF/CSV出力API。

リクエストボディ:
```json
{
  "format": "pdf",
  "records": [...],
  "dateFrom": "2025-01-01",
  "dateTo": "2025-12-31"
}
```

#### `/api/kobutsu/batch/ai-extraction` (POST)
AI情報抽出バッチAPI。`ai_extraction_status='pending'` のレコードを処理。

処理内容:
- 仕入先URLからHTMLを取得
- Claude APIで情報抽出（仕入先名、商品特徴、画像URL）
- `kobutsu_ledger` テーブル更新

#### `/api/kobutsu/batch/rpa-pdf` (POST)
RPA PDF取得バッチAPI。`rpa_pdf_status='pending'` のレコードを処理。

処理内容:
- Playwrightで仕入先サイトにログイン
- 取引完了画面をPDFとして保存
- `kobutsu_ledger` テーブル更新

### 4. サービス

#### `services/kobutsu/AIScraper.ts`
AI情報抽出サービス。Claude APIを使用して仕入先ページから情報を抽出。

主要メソッド:
- `extractSupplierInfo(url)`: 仕入先情報を抽出
- `downloadImage(imageUrl, destinationPath)`: 商品画像をダウンロード

#### `services/kobutsu/RPA_PDF_Batch.ts`
RPA PDF取得サービス。Playwrightを使用して取引証明書PDFを自動取得。

主要メソッド:
- `fetchTransactionPDF(orderId, url, credentials)`: PDF取得
- `handleYahooAuction()`: Yahoo!オークション専用処理
- `handleAmazon()`: Amazon専用処理
- `handleRakuten()`: 楽天市場専用処理
- `handleMercari()`: メルカリ専用処理

## 運用フロー

### 1. 仕入れ実行（外注スタッフ操作）

```
1. 受注管理ツールで受注を選択
2. 「実際の仕入れ先URL」を入力
3. 「実際の仕入れ値」を入力
4. [仕入れ済み]ボタンをクリック
   ↓
5. トリプルアクション実行:
   - 利益確定（sales_orders 更新）
   - RPAキュー投入（pdf_get_required = TRUE）
   - 古物台帳仮レコード作成（kobutsu_ledger）
   ↓
6. 古物台帳ステータスに「登録済み（緑）」が表示される
```

### 2. AI情報抽出（夜間バッチ自動実行）

```
1. Cron または手動で `/api/kobutsu/batch/ai-extraction` を実行
   ↓
2. `ai_extraction_status='pending'` のレコードを取得
   ↓
3. 各レコードに対して:
   - 仕入先URLからHTMLを取得
   - Claude APIで情報抽出
   - kobutsu_ledger テーブル更新
     * supplier_name
     * supplier_type
     * item_features
     * source_image_path
     * ai_extraction_status = 'completed'
```

### 3. RPA PDF取得（夜間バッチ自動実行）

```
1. Cron または手動で `/api/kobutsu/batch/rpa-pdf` を実行
   ↓
2. `rpa_pdf_status='pending'` のレコードを取得
   ↓
3. 各レコードに対して:
   - Playwright でブラウザを起動
   - 仕入先サイトにログイン
   - 取引完了画面に移動
   - PDFとして保存
   - kobutsu_ledger テーブル更新
     * proof_pdf_path
     * rpa_pdf_status = 'completed'
```

### 4. 税務調査対応

```
1. 古物台帳レポート画面（/kobutsu/report）にアクセス
   ↓
2. 対象期間を指定（例: 2025年1月1日 〜 2025年12月31日）
   ↓
3. [PDF出力]ボタンをクリック
   ↓
4. 古物台帳PDFをダウンロード（税務署に提出可能な形式）
```

## セットアップ

### 1. データベースマイグレーション

```bash
# Supabaseダッシュボードから以下のSQLを実行
# または Supabase CLI を使用
supabase migration up
```

マイグレーションファイル:
- `supabase/migrations/20251122_create_kobutsu_ledger.sql`

### 2. 環境変数設定

`.env.local` に以下を追加:

```bash
# Anthropic API（AI抽出用）
ANTHROPIC_API_KEY=sk-ant-xxx...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# RPA認証情報（JSON形式）
SUPPLIER_CREDENTIALS='{"username":"your-email","password":"your-password"}'
```

### 3. 依存パッケージのインストール

```bash
npm install playwright @anthropic-ai/sdk pdfkit
npx playwright install
```

### 4. ストレージディレクトリ作成

```bash
mkdir -p storage/kobutsu-pdfs
```

### 5. Cronジョブ設定（オプション）

夜間バッチを自動実行する場合、Vercel Cronまたは外部Cronサービスを設定:

```bash
# 毎日午前2時にAI抽出バッチ実行
0 2 * * * curl -X POST https://your-domain.com/api/kobutsu/batch/ai-extraction

# 毎日午前3時にRPA PDFバッチ実行
0 3 * * * curl -X POST https://your-domain.com/api/kobutsu/batch/rpa-pdf
```

## トラブルシューティング

### 古物台帳が「未登録（赤）」になる

**原因**:
- トリプルアクションAPI実行時にエラーが発生
- データベース接続エラー

**対処**:
1. ブラウザのコンソールでエラーログを確認
2. Supabaseのログを確認
3. `/api/order/complete-acquisition` を直接テスト

### AI抽出が失敗する

**原因**:
- ANTHROPIC_API_KEYが未設定または無効
- 仕入先URLが無効またはアクセス不可
- Claude APIのレート制限

**対処**:
1. `.env.local` でAPIキーを確認
2. 仕入先URLに手動でアクセス可能か確認
3. バッチ処理の実行間隔を調整

### RPA PDF取得が失敗する

**原因**:
- ログイン認証情報が無効
- 仕入先サイトのUIが変更された
- Playwrightのセレクタが一致しない

**対処**:
1. `SUPPLIER_CREDENTIALS` を確認
2. `services/kobutsu/RPA_PDF_Batch.ts` のセレクタを更新
3. ヘッドレスモードをオフ（`headless: false`）にしてデバッグ

## セキュリティ

- **API認証**: すべてのバッチAPIは本番環境でAPI認証を実装すること
- **ログイン認証情報**: 環境変数で管理し、コードにハードコードしない
- **PDFストレージ**: 本番環境ではクラウドストレージ（S3、GCS等）を使用
- **アクセス制御**: 古物台帳データは管理者のみアクセス可能にする

## 今後の拡張

- [ ] 複数商品を含む受注への対応
- [ ] AI抽出結果の手動修正UI
- [ ] PDF取得失敗時の通知機能
- [ ] 古物台帳の検索機能強化
- [ ] 外部ストレージ（S3）への自動アップロード
- [ ] AI抽出精度の向上（Claude以外のモデルも検証）
- [ ] RPA処理のリトライ機能

## ライセンス

このシステムは古物営業法に基づく法定記録のために開発されました。
