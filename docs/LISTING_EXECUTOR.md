# 多販路出品API連携 実装ドキュメント

## 概要

戦略エンジンが決定した推奨出品先に対し、各モールのAPIを介して安全かつ確実に出品を実行する「実行エンジン」です。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│           POST /api/listing/execute                      │
│        (Cronジョブから定期実行)                          │
└────────────────────┬────────────────────────────────────┘
                     ↓
            ┌────────────────────┐
            │ ListingExecutor     │
            │  (実行エンジン)      │
            └────────┬────────────┘
                     ↓
      ┌──────────────┼──────────────┐
      ↓              ↓               ↓
┌──────────┐  ┌──────────┐   ┌─────────────┐
│ EbayClient│  │AmazonSP  │   │Coupang      │
│ (Trading │  │Client    │   │Client       │
│  API)    │  │(SP-API)  │   │(Partner API)│
└────┬─────┘  └────┬─────┘   └──────┬──────┘
     ↓             ↓                 ↓
   eBay         Amazon            Coupang
```

## ファイル構造

```
types/
└── listing.ts                        # 型定義（拡張）
    - ExecutionStatus
    - ExecutionResult
    - BatchExecuteRequest/Response
    - ApiCredentials
    - ListingPayload

lib/api-clients/
├── BaseApiClient.ts                  # 基盤抽象クラス
├── EbayClient.ts                     # eBay Trading API
├── AmazonSPClient.ts                 # Amazon SP-API
└── CoupangClient.ts                  # Coupang Partner API

services/
└── ListingExecutor.ts                # 出品実行サービス

app/api/listing/execute/
└── route.ts                          # 出品実行APIエンドポイント
```

## 主要機能

### 1. APIクライアント層

#### BaseApiClient（抽象クラス）

全てのAPIクライアントが継承する基盤クラス。

**主要メソッド**:
- `verifyListing(payload)` - 事前検証
- `addListing(payload)` - 出品実行
- `updateListing(listingId, payload)` - 出品更新
- `deleteListing(listingId)` - 出品削除
- `updateQuantity(listingId, quantity)` - 在庫数更新
- `updatePrice(listingId, price)` - 価格更新

**共通機能**:
- エラー分類（一時的 or 致命的）
- リトライロジック（最大3回、指数バックオフ）
- ログ出力

#### EbayClient

**認証**: OAuth トークン + App/Dev/Cert ID

**主要API**:
- `VerifyAddItem` - 事前検証（出品前に必ず実行）
- `AddItem` - 出品実行
- `ReviseItem` - 出品更新
- `EndItem` - 出品削除
- `ReviseInventoryStatus` - 在庫・価格更新

**特徴**:
- XML形式のリクエスト/レスポンス
- `fast-xml-parser` を使用してXMLをパース
- カテゴリID、コンディションIDのマッピング
- 画像最大12枚
- タイトル最大80文字

**使用例**:
```typescript
const client = new EbayClient(credentials.ebay);

// 事前検証
const verifyResult = await client.verifyListing(payload);
if (!verifyResult.success) {
  console.error('Verification failed:', verifyResult.error);
}

// 出品実行
const addResult = await client.addListing(payload);
if (addResult.success) {
  console.log('Item ID:', addResult.data);
}
```

#### AmazonSPClient

**認証**: LWA (Login with Amazon) OAuth

**主要API**:
- `Listings Items API` - 出品管理
- トークンの自動取得・更新

**特徴**:
- JSON形式のリクエスト/レスポンス
- リージョン別エンドポイント（us/eu/fe）
- SKUがリスティングIDとして機能
- 事前検証APIなし（データ形式のみ検証）

**使用例**:
```typescript
const client = new AmazonSPClient(credentials.amazon);

// 出品実行
const addResult = await client.addListing(payload);
if (addResult.success) {
  console.log('SKU:', addResult.data); // AmazonではSKUがID
}
```

#### CoupangClient

**認証**: HMAC-SHA256 署名

**主要API**:
- `/v2/providers/marketplace/apis/api/v1/create-product` - 出品作成
- `/v2/providers/marketplace/apis/api/v1/update-product` - 出品更新

**特徴**:
- JSON形式のリクエスト/レスポンス
- HMAC署名による認証
- 韓国法定表示事項（상품 정보 고시）が必要
- 画像最大10枚

**使用例**:
```typescript
const client = new CoupangClient(credentials.coupang);

// 出品実行
const addResult = await client.addListing(payload);
if (addResult.success) {
  console.log('Product ID:', addResult.data);
}
```

### 2. 出品実行サービス (ListingExecutor)

#### 実行フロー

```
1. 実行対象の選定（selectCandidates）
   ↓
2. 実行前チェック（preExecutionCheck）
   ↓
3. 出品実行（executeListing）
   ↓
4a. 成功時の処理（handleSuccess）
   - ステータスを「出品中」に更新
   - listing_idを記録
   - 在庫引当ログを記録
   - 在庫連動ロジック（B-3）に通知
   ↓
4b. 失敗時の処理（handleFailure）
   - 一時的エラー: リトライキューに追加
   - 致命的エラー: 出品停止（要確認）
   - エラーログを記録
```

#### 1. 実行対象の選定

**selectCandidates(status, minStock)**

```typescript
// DBから戦略決定済みSKUを抽出
const { data: products } = await supabase
  .from('products_master')
  .select('*')
  .eq('execution_status', 'strategy_determined')
  .gte('stock_quantity', 1);

// 各SKUの推奨プラットフォームと出品データを取得
for (const product of products) {
  // 戦略決定ログから推奨先を取得
  const { data: strategy } = await supabase
    .from('strategy_decisions')
    .select('recommended_platform, recommended_account_id')
    .eq('sku', product.sku)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 出品データ（第3層）を取得
  const { data: listingData } = await supabase
    .from('listing_data')
    .select('title, description, item_specifics, image_urls, category_id')
    .eq('sku', product.sku)
    .eq('platform', strategy.recommended_platform)
    .single();

  // 価格データ（第4層）を取得
  const { data: priceData } = await supabase
    .from('price_logs')
    .select('price_jpy, currency')
    .eq('sku', product.sku)
    .order('changed_at', { ascending: false })
    .limit(1)
    .single();

  // ExecutionCandidateを構築
  candidates.push({ sku, platform, accountId, title, price, ... });
}
```

#### 2. 実行前チェック

**preExecutionCheck(candidate)**

- 在庫確認: `quantity >= 1`
- 価格確認: `price > 0` && `!isNaN(price)`
- 画像確認: `images.length > 0`
- タイトル確認: `title.length > 0`
- 排他制御: 同じSKUが既に処理中でないか確認

#### 3. 出品実行

**executeListing(candidate)**

```typescript
// APIクライアントを取得
const client = this.getClient(platform);

// ペイロードを構築
const payload: ListingPayload = {
  sku, title, description, price, currency,
  quantity, condition, categoryId, images, itemSpecifics
};

// 事前検証（eBayのみ）
if (platform === 'ebay') {
  const verifyResult = await client.verifyListing(payload);
  if (!verifyResult.success) {
    return failureResult;
  }
}

// 出品実行
const addResult = await client.addListing(payload);

return {
  sku, platform, accountId,
  success: addResult.success,
  listingId: addResult.data,
  errorType: addResult.error?.type,
  errorCode: addResult.error?.code,
  errorMessage: addResult.error?.message,
  timestamp: new Date()
};
```

#### 4. 成功時の処理

**handleSuccess(result)**

トランザクション内で以下を実行：

```typescript
// 1. ステータスを「出品中」に更新
await supabase
  .from('products_master')
  .update({ execution_status: 'listed' })
  .eq('sku', sku);

// 2. listing_idを記録
await supabase
  .from('listing_data')
  .update({
    listing_id: listingId,
    status: 'Active',
    listed_at: new Date().toISOString()
  })
  .eq('sku', sku)
  .eq('platform', platform)
  .eq('account_id', accountId);

// 3. 在庫引当ログを記録
await supabase.from('stock_logs').insert({
  sku,
  supplier_id: null,
  quantity_change: -1,
  new_quantity: 0,
  reason: `SKU: ${sku} が ${platform} に 1個引当済み`,
  changed_at: new Date().toISOString()
});

// 4. 在庫連動ロジック（B-3）に通知
await this.notifyInventorySync(sku, platform, listingId);
```

#### 5. 失敗時の処理

**handleFailure(result)**

```typescript
if (errorType === 'temporary') {
  // 一時的エラー：リトライキューに追加
  await supabase
    .from('products_master')
    .update({ execution_status: 'api_retry_pending' })
    .eq('sku', sku);

  await supabase.from('execution_queue').insert({
    sku, platform, account_id: accountId,
    status: 'retry_pending',
    error_code: errorCode,
    error_message: errorMessage,
    retry_count: 0,
    next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5分後
  });
} else {
  // 致命的エラー：出品停止（要確認）
  await supabase
    .from('products_master')
    .update({ execution_status: 'listing_failed' })
    .eq('sku', sku);

  // ダッシュボードでアラート表示用のフラグを設定
  await supabase.from('listing_data').update({
    status: 'Error',
    error_message: errorMessage
  }).eq('sku', sku).eq('platform', platform).eq('account_id', accountId);
}

// エラーログを記録
await supabase.from('execution_logs').insert({
  sku, platform, account_id: accountId,
  success: false,
  error_type: errorType,
  error_code: errorCode,
  error_message: errorMessage,
  executed_at: new Date().toISOString()
});
```

### 3. 出品実行APIエンドポイント

#### POST /api/listing/execute

**リクエスト**:
```typescript
{
  filter?: {
    status?: 'strategy_determined' | 'api_retry_pending' | ...,
    minStock?: number,
    platforms?: Platform[]
  },
  dryRun?: boolean  // trueの場合は実行せずに候補のみ返却
}
```

**レスポンス**:
```typescript
{
  totalProcessed: number,
  successCount: number,
  failureCount: number,
  results: ExecutionResult[],
  errors: { sku: string, error: string }[]
}
```

**使用例**:
```bash
# 戦略決定済み商品を一括出品
curl -X POST http://localhost:3000/api/listing/execute \
  -H "Content-Type: application/json" \
  -d '{"filter": {"status": "strategy_determined", "minStock": 1}}'

# ドライラン（実行せずに候補のみ確認）
curl -X POST http://localhost:3000/api/listing/execute \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

#### GET /api/listing/execute

実行状況を確認

**レスポンス**:
```typescript
{
  stats: {
    queueLength: number,
    pendingRetries: number,
    recentSuccesses: number,
    recentFailures: number
  },
  queue: ExecutionQueueItem[],
  recentLogs: ExecutionLog[]
}
```

## 環境変数設定

```bash
# eBay
EBAY_APP_ID=your_app_id
EBAY_DEV_ID=your_dev_id
EBAY_CERT_ID=your_cert_id
EBAY_OAUTH_TOKEN=your_oauth_token
EBAY_SITE_ID=0  # 0=US, 15=Australia, 186=Japan

# Amazon
AMAZON_REGION=us  # us, eu, fe
AMAZON_CLIENT_ID=your_client_id
AMAZON_CLIENT_SECRET=your_client_secret
AMAZON_REFRESH_TOKEN=your_refresh_token
AMAZON_SELLER_ID=your_seller_id
AMAZON_MARKETPLACE_ID=ATVPDKIKX0DER  # US marketplace

# Coupang
COUPANG_ACCESS_KEY=your_access_key
COUPANG_SECRET_KEY=your_secret_key
COUPANG_VENDOR_ID=your_vendor_id
```

## データベーススキーマ（追加）

### execution_queue テーブル

```sql
CREATE TABLE execution_queue (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('retry_pending', 'processing', 'completed', 'failed')),
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### execution_logs テーブル

```sql
CREATE TABLE execution_logs (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  listing_id TEXT,
  error_type TEXT CHECK (error_type IN ('temporary', 'fatal')),
  error_code TEXT,
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

### inventory_sync_queue テーブル

```sql
CREATE TABLE inventory_sync_queue (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  trigger_platform TEXT NOT NULL,
  trigger_listing_id TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### products_master テーブル（execution_status 追加）

```sql
ALTER TABLE products_master
ADD COLUMN execution_status TEXT CHECK (execution_status IN (
  'strategy_determined',
  'listing_in_progress',
  'listed',
  'api_retry_pending',
  'listing_failed',
  'delisted'
));
```

## Cronジョブ設定

VPSで定期的にPOST /api/listing/executeを呼び出す設定：

```cron
# 毎時1回実行（0分）
0 * * * * curl -X POST http://localhost:3000/api/listing/execute -H "Content-Type: application/json" -d '{"filter": {"status": "strategy_determined"}}'

# リトライキューを毎10分処理
*/10 * * * * curl -X POST http://localhost:3000/api/listing/execute -H "Content-Type: application/json" -d '{"filter": {"status": "api_retry_pending"}}'
```

## エラーハンドリング

### 一時的エラー（temporary）

**例**:
- Timeout
- Rate limit exceeded (429)
- Service unavailable (503)
- "Try again later"

**対応**:
1. `execution_status` を `api_retry_pending` に更新
2. `execution_queue` にリトライジョブを追加
3. 5分後に自動リトライ
4. 最大3回リトライ

### 致命的エラー（fatal）

**例**:
- Invalid credentials
- Item already exists
- Category not allowed
- Missing required field

**対応**:
1. `execution_status` を `listing_failed` に更新
2. `listing_data.status` を `Error` に更新
3. ダッシュボードで赤色アラート表示
4. 手動確認が必要

## トラブルシューティング

### 問題: 認証エラー

**原因**: APIクレデンシャルが無効

**解決策**:
1. 環境変数が正しく設定されているか確認
2. トークンの有効期限を確認
3. APIキーの権限を確認

### 問題: すべての出品が失敗する

**原因**: ペイロードが不正

**解決策**:
1. `execution_logs` テーブルのエラーメッセージを確認
2. 必須フィールド（title, price, images）が含まれているか確認
3. カテゴリIDが正しいか確認

### 問題: リトライが無限ループする

**原因**: エラー分類が間違っている

**解決策**:
1. `classifyError()` メソッドを確認
2. エラーメッセージに基づいて一時的/致命的を正しく判定
3. リトライ回数上限（3回）を設定

## まとめ

このシステムにより:

1. ✅ **自動化された出品実行**: 戦略決定済み商品を自動で各モールに出品
2. ✅ **安全な実行**: 事前チェック、排他制御、エラーハンドリング
3. ✅ **モジュラーアーキテクチャ**: 新しいプラットフォームを簡単に追加可能
4. ✅ **詳細なログ**: 実行結果、エラー、リトライ状況を全て記録
5. ✅ **在庫連動**: 出品成功時に他モールの在庫を自動調整
6. ✅ **スケジュール実行**: Cronで定期的に自動実行

## ライセンス

社内利用のみ
