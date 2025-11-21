# 統合出品データ管理UI 実装ドキュメント

## 概要

多販路の出品状況を単一のUIで正確に把握し、**在庫・価格ロジック（第1層/第4層）と出品データ（第3層）の操作を論理的に分離**した販売戦略の中枢システムです。

## 技術スタック

- **フロントエンド**: React, Next.js 14, TypeScript
- **データ取得**: Fetch API（TODO: TanStack Query への移行推奨）
- **データベース**: Supabase (PostgreSQL)
- **スタイリング**: Tailwind CSS

## ファイル構造

```
app/
└── tools/listing-management/
    └── page.tsx                    # メインページ

app/api/listing/
├── integrated/route.ts             # 統合データ取得API
├── edit/route.ts                   # データ編集API
├── mode-switch/route.ts            # モード切替API
├── stop/route.ts                   # 出品停止API
└── logs/[sku]/route.ts            # ログ取得API

components/listing/
├── IntegratedListingTable.tsx      # 統合管理テーブル
├── ListingEditModal.tsx            # 編集モーダル
└── StockDetailPanel.tsx            # 在庫・原価詳細パネル

types/
└── listing.ts                      # 型定義
```

## 主要機能

### 1. 統合管理テーブル

**パス**: `/app/tools/listing-management`

#### 機能

- **SKU一覧表示**: 全SKUの出品状況を一覧表示
- **モール別ステータス**: 各モールの出品状況をアイコンで表示（緑/赤/黄）
- **在庫表示**: 自社有在庫 + 無在庫仕入れ先の合計在庫を表示
- **パフォーマンススコア**: A+/D などのグレード表示
- **推奨プラットフォーム**: P-2戦略エンジンの推奨先を表示
- **価格変動頻度**: 🔥マークで頻繁な価格変動を可視化

#### フィルタリング機能

- SKU/タイトル検索
- 最小/最大在庫数指定
- カテゴリ絞り込み
- コンディション絞り込み
- プラットフォーム絞り込み

#### ソート機能

- SKU
- タイトル
- 在庫数
- スコア
- 価格
- 更新日時

### 2. 出品データ編集モーダル

**コンポーネント**: `ListingEditModal.tsx`

#### 機能

- **基本情報編集**: タイトル、説明文
- **Item Specifics編集**: キー/値ペアの追加・編集・削除
- **VERO対策連携**: ブランド名を自動で正式名に補完
- **バリエーション管理**: 子SKU、画像、価格の管理
- **出品モード切替**: 中古優先 ⇔ 新品優先のトグル

#### VERO対策機能

Item Specifics内の「ブランド名」フィールドに対し、在庫マスターのVERO対策ロジックを参照し、自動で**正式名を補完・挿入**する機能を実装。

#### モード切替機能

トグルスイッチで中古優先 ⇔ 新品優先を切り替え。切替と同時に、`POST /api/listing/mode-switch` を呼び出し、価格調整ロジック（第4層）に新しいモードでの価格再計算を非同期でトリガー。

### 3. 在庫・原価詳細パネル

**コンポーネント**: `StockDetailPanel.tsx`

SKUクリック時に起動するサイドパネルで、複雑な在庫ロジックを明確に可視化。

#### タブ構成

1. **在庫詳細タブ**
   - 合計利用可能在庫
   - 自社有在庫
   - 仕入れ先別在庫（優先度順）
   - 現在の原価ベース明示（オレンジ色で強調）

2. **価格履歴タブ**
   - 価格変動履歴（直近100件）
   - 変動理由（例: "競合価格下落", "仕入れ原価上昇"）
   - プラットフォーム別表示

3. **エラータブ**
   - HTML解析エラー履歴
   - エラータイプ（image_broken, description_truncated など）
   - 解決済み/未解決のステータス表示

## API仕様

### 1. GET /api/listing/integrated

統合データ取得API

#### クエリパラメータ

```
page: number            # ページ番号（デフォルト: 1）
pageSize: number        # ページサイズ（デフォルト: 50）
filters: JSON<ListingFilter>  # フィルター条件
sort: JSON<ListingSort>       # ソート条件
```

#### レスポンス

```typescript
{
  items: ListingItem[];
  total: number;
  page: number;
  pageSize: number;
  availableFilters: {
    platforms: Platform[];
    categories: string[];
    ebayCategories?: string[];  // 動的フィルター
  };
}
```

### 2. POST /api/listing/edit

出品データ編集API

#### リクエスト

```typescript
{
  sku: string;
  platform: Platform;
  accountId: string;
  updates: {
    title?: string;
    description?: string;
    itemSpecifics?: ItemSpecific[];
    variations?: VariationChild[];
    imageUrls?: string[];
  };
}
```

#### レスポンス

```typescript
{
  success: boolean;
  data: ListingData;
}
```

#### 重要な制約

⚠️ **このAPIは第3層データ（タイトル、バリエーション、Item Specificsなど）のみを更新します。在庫や価格ロジック（第1層/第4層）のDBは絶対に触りません。**

### 3. POST /api/listing/mode-switch

出品モード切替API

#### リクエスト

```typescript
{
  sku: string;
  platform: Platform;
  accountId: string;
  newMode: 'used_priority' | 'new_priority';
}
```

#### レスポンス

```typescript
{
  success: boolean;
  message: string;
  data: {
    sku: string;
    platform: Platform;
    accountId: string;
    oldMode: ListingMode;
    newMode: ListingMode;
  };
}
```

#### 動作

1. `listing_data` テーブルの `listing_mode` を更新
2. `listing_mode_switch_logs` に履歴を記録
3. `price_recalculation_queue` にジョブを追加（非同期処理）
4. VPSバッチ処理に通知（TODO: Webhook実装）

### 4. GET /api/listing/logs/[sku]

ログ取得API

#### レスポンス

```typescript
{
  sku: string;
  priceHistory: PriceHistory[];    # 価格変動履歴（最大100件）
  stockHistory: StockHistory[];    # 在庫変動履歴（最大100件）
  htmlParseErrors: HtmlParseError[];  # HTMLエラー履歴（最大50件）
}
```

### 5. POST /api/listing/stop

出品停止API

#### リクエスト

```typescript
{
  sku: string;
  platform: Platform;
  accountId: string;
  reason?: string;
}
```

#### レスポンス

```typescript
{
  success: boolean;
  message: string;
  data: {
    sku: string;
    platform: Platform;
    accountId: string;
    stoppedAt: string;
  };
}
```

#### 動作

1. プラットフォームAPIで出品停止（ebayClient.endListing 等）
2. `listing_data` テーブルの `status` を `'Inactive'` に更新
3. `listing_stop_logs` に履歴を記録

## データベーススキーマ（推奨）

### products_master テーブル

```sql
CREATE TABLE products_master (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  title TEXT,
  category TEXT,
  condition TEXT CHECK (condition IN ('New', 'Used', 'Refurbished')),
  stock_quantity INTEGER DEFAULT 0,
  price_jpy NUMERIC(10, 2),
  hts_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### listing_data テーブル

```sql
CREATE TABLE listing_data (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  listing_id TEXT,
  title TEXT,
  description TEXT,
  listing_mode TEXT CHECK (listing_mode IN ('used_priority', 'new_priority')),
  item_specifics JSONB,
  variations JSONB,
  image_urls TEXT[],
  status TEXT CHECK (status IN ('Active', 'Inactive', 'Error')),
  error_message TEXT,
  last_synced_at TIMESTAMP,
  listed_at TIMESTAMP,
  stopped_at TIMESTAMP,
  stop_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (sku, platform, account_id)
);
```

### supplier_stocks テーブル

```sql
CREATE TABLE supplier_stocks (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT,
  stock_quantity INTEGER DEFAULT 0,
  cost_jpy NUMERIC(10, 2),
  priority INTEGER,  -- 優先度（1が最優先）
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (sku, supplier_id)
);
```

### price_logs テーブル

```sql
CREATE TABLE price_logs (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  platform TEXT NOT NULL,
  price_jpy NUMERIC(10, 2),
  reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

### stock_logs テーブル

```sql
CREATE TABLE stock_logs (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  supplier_id TEXT,
  quantity_change INTEGER,
  new_quantity INTEGER,
  reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);
```

### html_parse_errors テーブル

```sql
CREATE TABLE html_parse_errors (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  platform TEXT NOT NULL,
  error_type TEXT CHECK (error_type IN ('image_broken', 'description_truncated', 'invalid_html', 'other')),
  error_message TEXT,
  detected_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### strategy_decisions テーブル

```sql
CREATE TABLE strategy_decisions (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  recommended_platform TEXT,
  score NUMERIC(5, 2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### sales_performance テーブル

```sql
CREATE TABLE sales_performance (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  total_sales NUMERIC(10, 2),
  profit_margin NUMERIC(5, 4),
  inventory_turnover NUMERIC(5, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### price_recalculation_queue テーブル

```sql
CREATE TABLE price_recalculation_queue (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  platform TEXT NOT NULL,
  listing_mode TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  queued_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
```

### listing_edit_logs テーブル

```sql
CREATE TABLE listing_edit_logs (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  changes JSONB,
  edited_at TIMESTAMP DEFAULT NOW()
);
```

### listing_mode_switch_logs テーブル

```sql
CREATE TABLE listing_mode_switch_logs (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  old_mode TEXT,
  new_mode TEXT,
  switched_at TIMESTAMP DEFAULT NOW()
);
```

### listing_stop_logs テーブル

```sql
CREATE TABLE listing_stop_logs (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  listing_id TEXT,
  reason TEXT,
  stopped_at TIMESTAMP DEFAULT NOW()
);
```

## 使い方

### 1. 基本的な操作フロー

1. **SKU一覧を確認**
   - `/tools/listing-management` にアクセス
   - 全SKUの出品状況が一覧表示される

2. **在庫詳細を確認**
   - SKUをクリック
   - 右側に在庫・原価詳細パネルが表示される
   - 仕入れ先別在庫、価格履歴、エラー履歴を確認

3. **出品データを編集**
   - 「編集」ボタンをクリック
   - タイトル、説明文、Item Specifics、バリエーションを編集
   - VERO対策機能により、ブランド名が自動補完される

4. **出品モードを切替**
   - 編集モーダル内で「中古優先」⇔「新品優先」をトグル
   - 価格再計算が自動で開始される

5. **出品を停止**
   - 「停止」ボタンをクリック（TODO: UI実装）
   - プラットフォームAPIで出品停止

### 2. フィルタリング

- **SKU/タイトル検索**: 検索ボックスに入力
- **最小在庫数**: 在庫数フィルターを設定
- **検索ボタン**: クリックでフィルター適用

### 3. ページネーション

- 1ページあたり50件表示（変更可能）
- 「前へ」「次へ」ボタンでページ移動

## TODO: 今後の実装

### 1. TanStack Query への移行

現在は Fetch API を直接使用していますが、TanStack Query への移行を推奨します。

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

const { data, isLoading, error } = useQuery({
  queryKey: ['listings', page, filters, sort],
  queryFn: () => fetchIntegratedListings(page, filters, sort),
});

const editMutation = useMutation({
  mutationFn: (request: EditListingRequest) => editListing(request),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['listings'] });
  },
});
```

### 2. 動的フィルタリング機能の実装

選択されたモールでのみ取得可能な項目（例：eBayの出品カテゴリー、AmazonのASIN有無）をフィルターオプションに動的に追加表示するロジックを実装。

### 3. 統計情報の実装

メインページ上部の統計カード（総出品数、アクティブ出品、エラー、低在庫アラート）のデータ取得を実装。

### 4. 一括操作機能

複数SKUを選択して一括で編集・停止する機能を実装。

### 5. プラットフォームAPI連携

現在は TODO コメントとなっているプラットフォームAPI連携（eBay Trading API、Amazon SP-API など）の実装。

### 6. VERO対策APIの実装

`/api/vero/brand-name` エンドポイントを実装し、正式ブランド名を取得。

### 7. パフォーマンススコア計算ロジック（B-2）の精緻化

現在は簡易実装。実際の販売実績、在庫回転率、利益率などから正確にスコアを算出するロジックに置き換え。

### 8. 画像アップロード機能

バリエーション画像の直接アップロード機能を実装（現在はURL指定のみ）。

## トラブルシューティング

### 問題: データが表示されない

**原因**:
- データベースにデータが存在しない
- API エンドポイントエラー

**解決策**:
1. ブラウザのコンソールでエラーを確認
2. `/api/listing/integrated` にアクセスしてレスポンスを確認
3. `products_master` テーブルにデータが存在するか確認

### 問題: 在庫数が合計されない

**原因**:
- `supplier_stocks` テーブルにデータが存在しない
- `priority` または `is_active` の設定が正しくない

**解決策**:
1. `supplier_stocks` テーブルのデータを確認
2. `is_active = true` かつ `priority` が設定されているか確認

### 問題: モード切替が反映されない

**原因**:
- `price_recalculation_queue` が処理されていない
- VPSバッチ処理が動作していない

**解決策**:
1. `price_recalculation_queue` テーブルの `status` を確認
2. VPSバッチ処理のログを確認

## まとめ

このシステムにより:

1. ✅ **統合管理**: 多販路の出品状況を単一UIで把握
2. ✅ **論理的分離**: 在庫・価格ロジックと出品データを明確に分離
3. ✅ **VERO対策**: 自動でブランド名を補完
4. ✅ **柔軟なモード切替**: 中古優先/新品優先の切り替えで価格自動再計算
5. ✅ **詳細な履歴管理**: 価格変動、在庫変動、エラー履歴を時系列で表示

## ライセンス

社内利用のみ
