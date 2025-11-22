# 出荷管理システム V1.0 開発ドキュメント

## 概要

出荷管理システム V1.0は、Kanbanボード形式で出荷ステータスを管理し、週末・休日を考慮した出荷遅延予測を行うシステムです。

## 実装された機能

### 1. データベーススキーマ

**テーブル**: `shipping_queue`

```sql
CREATE TABLE shipping_queue (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) NOT NULL,
    queue_status TEXT NOT NULL CHECK (queue_status IN ('Pending', 'Picking', 'Packed', 'Shipped')),
    picker_user_id INTEGER REFERENCES users(id),
    tracking_number TEXT,
    shipping_method_id TEXT,
    is_delayed_risk BOOLEAN DEFAULT FALSE,
    expected_ship_date DATE,
    delay_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**カラム説明**:
- `queue_status`: Kanbanボードの列（Pending, Picking, Packed, Shipped）
- `picker_user_id`: ピッキング担当者のユーザーID
- `tracking_number`: 追跡番号
- `shipping_method_id`: 配送方法ID
- `is_delayed_risk`: 遅延リスクフラグ
- `expected_ship_date`: 予測出荷日
- `delay_reason`: 遅延理由（Holiday_Impact, Sourcing_Pending等）

### 2. 出荷遅延予測ロジック

**ファイル**: `/services/shippingDelayPredictor.ts`

**主要関数**:

#### `predictShippingDelay()`
週末や休日を考慮して出荷遅延リスクと予測日を計算します。

```typescript
predictShippingDelay(
  dueDate: Date,
  isSourced: boolean,
  sourcingArrivalDate?: Date
): {
  isDelayedRisk: boolean
  expectedShipDate: Date
  reason: string
}
```

**パラメータ**:
- `dueDate`: 納品期限日
- `isSourced`: 仕入れが完了しているか
- `sourcingArrivalDate`: 仕入れ品が到着する予測日

**返り値**:
- `isDelayedRisk`: 遅延リスクがあるかどうか
- `expectedShipDate`: 予測出荷日
- `reason`: 遅延理由（'Sourcing_Pending', 'DueDate_Exceeded', 'None'）

#### `addBusinessDays()`
営業日を計算します（土日祝日を除く）。

```typescript
addBusinessDays(startDate: Date, businessDays: number): Date
```

#### `getBusinessDaysBetween()`
2つの日付の間の営業日数を計算します。

```typescript
getBusinessDaysBetween(startDate: Date, endDate: Date): number
```

### 3. 出荷キュー管理 UI（Kanbanボード）

**ファイル**: `/app/tools/shipping-manager/page.tsx`

**機能**:
- **T47: D&Dロジック**: ドラッグ&ドロップでステータスを変更
- **T48: 仕入れ済みアイコン**: 仕入れが完了した商品にアイコン点灯
- **T49: 遅延リスク警告**: 遅延リスクのある商品を赤枠で強調表示
- **T50: Kanbanボード**: 4つの列（Pending, Picking, Packed, Shipped）で管理

**使用ライブラリ**:
- `@hello-pangea/dnd`: React 19対応のドラッグ&ドロップライブラリ

**UI要素**:
1. **統計カード**: 総件数、各ステータスの件数、遅延リスク数を表示
2. **Kanbanボード**: 4つの列でタスクを管理
   - 仕入れ待ち (Phase 1連携)
   - ピッキング
   - 梱包
   - 出荷完了
3. **タスクカード**: 各注文の詳細を表示
   - 注文ID
   - マーケットプレイス
   - 商品名
   - 仕入れステータス
   - 遅延リスク警告
   - 予測出荷日

### 4. 出荷アクションモーダル

**ファイル**: `/components/ShippingActionModal.tsx`

**機能**:
- **T51: 追跡番号入力と保存**: トラッキング番号を入力してDBに保存
- **T52: 伝票生成/印刷プレビュー**: 出荷伝票を生成して印刷プレビュー表示
- **T52: 顧客へ出荷通知**: マーケットプレイスAPIを通じて顧客に出荷通知を送信

**UI要素**:
1. 注文情報の表示
2. 追跡番号入力フィールド
3. アクションボタン:
   - 伝票印刷プレビュー
   - 保存
   - 顧客通知

### 5. API Routes

#### GET `/api/shipping/queue`
出荷キューのデータを取得します。

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "Pending": [...],
    "Picking": [...],
    "Packed": [...],
    "Shipped": [...]
  },
  "count": 10
}
```

#### POST `/api/shipping/update-status`
出荷ステータスを更新します。

**リクエスト**:
```json
{
  "orderId": "1",
  "newStatus": "Picking"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {...},
  "message": "Status updated to Picking"
}
```

#### POST `/api/shipping/update-tracking`
追跡番号を更新します。

**リクエスト**:
```json
{
  "orderId": "1",
  "trackingNumber": "EZ123456789HK"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {...},
  "message": "Tracking number updated successfully"
}
```

#### POST `/api/shipping/send-notification`
顧客へ出荷通知を送信します。

**リクエスト**:
```json
{
  "orderId": "1",
  "marketplace": "eBay",
  "trackingNumber": "EZ123456789HK"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "Shipment notification sent successfully"
}
```

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install @hello-pangea/dnd
```

### 2. データベースマイグレーション

```bash
# PostgreSQLデータベースに接続
psql -U postgres -d your_database

# マイグレーションファイルを実行
\i database/migrations/005_create_shipping_queue.sql
```

### 3. 環境変数の確認

`.env.local` に以下の環境変数が設定されていることを確認してください：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. アプリケーションの起動

```bash
npm run dev
```

### 5. 出荷管理画面へのアクセス

http://localhost:3000/tools/shipping-manager

## 使用方法

### Kanbanボードでの操作

1. **ステータス変更**: タスクカードをドラッグ&ドロップして別の列に移動
2. **詳細表示**: タスクカードをクリックして出荷アクションモーダルを開く

### 出荷アクションモーダル

1. **追跡番号の入力**: 配送業者から提供された追跡番号を入力
2. **保存**: 追跡番号をデータベースに保存
3. **伝票印刷**: 出荷伝票のプレビューを表示して印刷
4. **顧客通知**: マーケットプレイスを通じて顧客に出荷通知を送信

### 出荷遅延予測

システムは以下の要因を考慮して出荷遅延を予測します：

1. **仕入れ状況**: 仕入れが未完了の場合、遅延リスクとして表示
2. **納品期限**: 予測出荷日が納品期限を超える場合、遅延リスクとして表示
3. **週末・休日**: 土日祝日を考慮した営業日ベースの予測

## データフロー

```
Phase 1（仕入れ管理）
  ↓
shipping_queue テーブル
  ↓
Kanbanボード（仕入れ待ち）
  ↓
D&Dでステータス変更
  ↓
ピッキング → 梱包 → 出荷完了
  ↓
追跡番号入力・顧客通知
```

## トラブルシューティング

### Kanbanボードが表示されない

1. `@hello-pangea/dnd` がインストールされているか確認
2. ブラウザのコンソールでエラーを確認
3. データベース接続を確認

### ドラッグ&ドロップが動作しない

1. ブラウザのJavaScriptが有効になっているか確認
2. React 19との互換性を確認（`@hello-pangea/dnd`はReact 19対応）

### 追跡番号が保存されない

1. Supabase接続とアクセス権限を確認
2. `shipping_queue`テーブルに`tracking_number`カラムが存在することを確認
3. `/api/shipping/update-tracking`エンドポイントが正しく実装されているか確認

## 今後の拡張

- [ ] リアルタイム更新（WebSocket/Supabase Realtime）
- [ ] 一括出荷処理
- [ ] 配送業者API連携（自動追跡番号取得）
- [ ] 出荷伝票のPDF生成
- [ ] 出荷統計レポート
- [ ] モバイル対応の最適化

## ファイル構成

```
database/migrations/
└── 005_create_shipping_queue.sql

services/
└── shippingDelayPredictor.ts

app/tools/shipping-manager/
└── page.tsx

components/
└── ShippingActionModal.tsx

app/api/shipping/
├── queue/route.ts
├── update-status/route.ts
├── update-tracking/route.ts
└── send-notification/route.ts
```

## 技術スタック

- **フロントエンド**: Next.js 16, React 19, TypeScript
- **UIコンポーネント**: Radix UI, Tailwind CSS
- **ドラッグ&ドロップ**: @hello-pangea/dnd
- **データベース**: PostgreSQL (Supabase)
- **API**: Next.js API Routes

## ライセンス

社内利用のみ。外部への配布禁止。
