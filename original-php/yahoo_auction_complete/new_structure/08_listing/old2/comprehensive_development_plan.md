# eBay出品ツール 完全開発指示書

## 1. プロジェクト概要

### 1.1 目的
既存商品データ（SKU）を活用して、eBayへの効率的な出品を可能にする総合出品ツールの開発。通常出品、バリエーション出品、セット商品出品の3つの出品タイプに対応し、セル紙ミラーとの連携により既存業務フローとの統合を実現する。

### 1.2 主要目標
- **効率化**: 既存商品データの再利用による出品作業の大幅短縮
- **重複防止**: バリエーション出品時の既存商品出品停止による重複回避
- **在庫連携**: セット商品の仮想在庫管理と自動在庫調整
- **システム統合**: セル紙ミラーとの完全連携による一元管理

## 2. 出品タイプ別機能要件

### 2.1 通常出品
**概要**: 単一商品をeBayに出品する基本機能

**主要機能**:
- 新規商品作成
- 既存商品（SKU）からの出品
- eBay準拠のカテゴリ選択
- 商品詳細情報入力
- 画像管理
- 配送・返品設定
- 価格設定

**必要な入力項目**:
```
基本情報:
- 商品タイトル (80文字以内)
- 商品説明 (HTML対応)
- カテゴリ (eBay API連携)
- 商品状態 (新品/中古等)
- ブランド
- MPN (Manufacturer Part Number)
- UPC/EAN (該当する場合)

価格・販売:
- 販売形式 (固定価格/オークション)
- 価格
- 数量
- 販売期間

配送:
- 配送方法
- 配送料金
- 取り扱い時間
- 国内/国際配送設定

返品:
- 返品ポリシー
- 返品期間

画像:
- メイン画像 (必須)
- 追加画像 (最大11枚)
```

### 2.2 バリエーション出品
**概要**: 1つの商品ページで複数のバリエーション（サイズ、色等）を管理

**主要機能**:
- 既存商品からのバリエーション作成
- バリエーション軸の動的設定
- 親子商品関係の管理
- 既存単体出品の自動停止
- バリエーション別価格・在庫設定
- 重複チェック機能

**バリエーション設定フロー**:
```
1. 親商品情報設定
   - 共通タイトル
   - 共通説明文
   - カテゴリ

2. バリエーション軸設定
   - 軸名称 (サイズ、色、状態等)
   - 各軸の値

3. 既存商品選択
   - SKU検索・選択
   - バリエーション属性の割り当て
   - 選択商品の出品停止確認

4. バリエーション商品生成
   - 親商品作成
   - 子商品（バリエーション）作成
   - eBay Variations API連携
```

**重複防止ロジック**:
- 選択されたSKUの既存eBay出品を検索
- バリエーション作成時に自動で既存出品を停止
- 停止予定商品の一覧表示と確認機能

### 2.3 セット商品出品
**概要**: 複数の既存商品を組み合わせてセット商品として出品

**主要機能**:
- 既存商品の検索・選択
- セット構成の視覚的編集
- 仮想在庫計算
- セット価格の自動計算
- 画像自動合成（オプション）
- 構成商品の在庫連携

**セット商品作成フロー**:
```
1. セット商品基本情報
   - セット名
   - セット説明
   - カテゴリ

2. 構成商品選択
   - SKU検索・選択
   - 各商品の必要数量設定
   - 商品情報プレビュー

3. 価格・在庫設定
   - 個別価格の合計表示
   - 割引率設定
   - 最終セット価格計算
   - 利用可能セット数表示

4. 在庫連携設定
   - 在庫減算タイミング（受注時/出荷時）
   - 在庫不足時のアクション
   - アラート設定
```

**仮想在庫計算ロジック**:
```javascript
// セット商品の利用可能数 = min(構成商品A在庫/必要数, 構成商品B在庫/必要数, ...)
function calculateBundleStock(components) {
  return Math.min(...components.map(comp => 
    Math.floor(comp.availableStock / comp.requiredQuantity)
  ));
}
```

## 3. UI/UX設計

### 3.1 メイン画面構成
```
┌─────────────────────────────────────────────────────────────┐
│                    eBay出品ツール                           │
├─────────────────────────────────────────────────────────────┤
│  [通常出品]  [バリエーション出品]  [セット商品出品]           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            出品方法選択                              │    │
│  │  ○ 新規商品を作成                                   │    │
│  │  ○ 既存商品（SKU）から作成                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            商品検索・選択                            │    │
│  │  [SKU検索] [商品名検索] [カテゴリ検索]               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            出品フォーム                              │    │
│  │  (選択された出品タイプに応じた専用フォーム)           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 eBay準拠のフォームデザイン
- eBayの実際の出品画面のレイアウトを参考
- 必須項目の明確な表示
- リアルタイムバリデーション
- プレビュー機能
- 保存・下書き機能

### 3.3 既存商品選択UI
```
┌─────────────────────────────────────────────────────────────┐
│  商品検索                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ SKU検索      │ │ 商品名検索   │ │ カテゴリ     │ [検索]    │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  検索結果                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ □ [画像] SKU001 | ポケモンカード リザードン | ¥5,000  │    │
│  │ □ [画像] SKU002 | ポケモンカード フシギダネ | ¥3,000  │    │
│  │ □ [画像] SKU003 | ポケモンカード ゼニガメ   | ¥3,500  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                               [選択] [キャンセル] │
└─────────────────────────────────────────────────────────────┘
```

## 4. データベース設計

### 4.1 商品マスター
```sql
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER,
    brand VARCHAR(100),
    price DECIMAL(10,2),
    cost DECIMAL(10,2),
    weight DECIMAL(8,3),
    dimensions JSONB,
    images JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 eBay出品管理
```sql
CREATE TABLE ebay_listings (
    id BIGSERIAL PRIMARY KEY,
    listing_id VARCHAR(50) UNIQUE,  -- eBay Item ID
    listing_type VARCHAR(20) NOT NULL, -- 'single', 'variation', 'bundle'
    parent_product_id BIGINT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    quantity INTEGER,
    category_id INTEGER,
    condition_id INTEGER,
    listing_duration VARCHAR(20),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    ebay_data JSONB,  -- eBay固有のデータ
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.3 バリエーション管理
```sql
CREATE TABLE variation_listings (
    id BIGSERIAL PRIMARY KEY,
    parent_listing_id BIGINT REFERENCES ebay_listings(id),
    product_id BIGINT REFERENCES products(id),
    variation_data JSONB,  -- バリエーション属性
    sku VARCHAR(100) NOT NULL,
    price DECIMAL(10,2),
    quantity INTEGER,
    ebay_variation_sku VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.4 セット商品管理
```sql
CREATE TABLE bundle_listings (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT REFERENCES ebay_listings(id),
    bundle_name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bundle_components (
    id BIGSERIAL PRIMARY KEY,
    bundle_id BIGINT REFERENCES bundle_listings(id),
    product_id BIGINT REFERENCES products(id),
    quantity_required INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.5 在庫管理連携
```sql
CREATE TABLE inventory_sync (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id),
    listing_id BIGINT REFERENCES ebay_listings(id),
    sync_type VARCHAR(20), -- 'single', 'variation', 'bundle'
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(20),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 5. API設計

### 5.1 商品検索API
```javascript
// GET /api/products/search
{
  "query": "リザードン",
  "sku": "SKU001",
  "category": "trading_cards",
  "status": "active",
  "page": 1,
  "limit": 20
}

// Response
{
  "products": [
    {
      "id": 1,
      "sku": "SKU001",
      "title": "ポケモンカード リザードン",
      "price": 5000,
      "images": ["url1", "url2"],
      "stock": 10,
      "ebay_status": "not_listed" // "listed", "not_listed", "ended"
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

### 5.2 出品作成API
```javascript
// POST /api/listings/create
{
  "type": "single", // "single", "variation", "bundle"
  "product_ids": [1, 2, 3],
  "listing_data": {
    "title": "商品タイトル",
    "description": "商品説明",
    "category_id": 12345,
    "condition_id": 1000,
    "price": 5000,
    "quantity": 10,
    "shipping": {},
    "return_policy": {}
  },
  "variation_config": {}, // バリエーション出品時のみ
  "bundle_config": {}     // セット商品時のみ
}
```

### 5.3 eBay API連携
```javascript
// eBay Trading API / Inventory API連携
class EbayAPIManager {
  async createSingleListing(listingData) {
    // Trading API: AddFixedPriceItem
  }
  
  async createVariationListing(parentData, variations) {
    // Inventory API: createOrReplaceInventoryItem
    // Inventory API: publishOffer
  }
  
  async endExistingListings(itemIds) {
    // Trading API: EndFixedPriceItem
  }
  
  async updateInventory(sku, quantity) {
    // Inventory API: bulkUpdateQuantity
  }
}
```

## 6. セル紙ミラー連携仕様

### 6.1 連携方法（想定）
- REST API による双方向連携
- 商品データの同期
- 在庫情報の共有
- 出品状況の通知

### 6.2 連携データ項目
```javascript
// セル紙ミラーとの連携データ構造（想定）
{
  "sku": "SKU001",
  "title": "商品名",
  "description": "説明",
  "price": 5000,
  "stock": 10,
  "images": ["url1", "url2"],
  "category": "trading_cards",
  "attributes": {
    "series": "VSTARユニバース",
    "condition": "mint"
  },
  "ebay_status": {
    "listed": true,
    "item_id": "123456789",
    "listing_type": "single"
  }
}
```

## 7. 開発フェーズ

### フェーズ1: 通常出品（基盤構築）
**期間**: 2-3週間
**成果物**:
- 商品検索・選択UI
- 基本出品フォーム
- eBay API連携（単体出品）
- 商品データベース基盤

**開発項目**:
1. データベース設計・構築
2. 商品検索機能
3. eBay準拠の出品フォーム
4. eBay API連携基盤
5. 基本的なバリデーション

### フェーズ2: 既存商品管理システム
**期間**: 2週間
**成果物**:
- 商品マスター管理
- SKU検索・選択機能
- 商品情報インポート

**開発項目**:
1. 商品マスターCRUD機能
2. 高度な検索機能
3. CSV/Excel インポート機能
4. 商品情報の一括更新

### フェーズ3: バリエーション出品
**期間**: 3-4週間
**成果物**:
- バリエーション作成UI
- 親子商品管理
- 重複防止システム
- eBay Variations API連携

**開発項目**:
1. バリエーション設定UI
2. 既存商品からのバリエーション作成
3. 重複チェック・出品停止機能
4. eBay Inventory API連携
5. バリエーション別在庫管理

### フェーズ4: セット商品機能
**期間**: 2-3週間
**成果物**:
- セット商品作成UI
- 仮想在庫管理
- 在庫連携システム

**開発項目**:
1. セット商品作成UI
2. 構成商品選択機能
3. 仮想在庫計算ロジック
4. 在庫連携・減算システム
5. セット商品専用の価格計算

### フェーズ5: セル紙ミラー連携
**期間**: 2週間
**成果物**:
- セル紙ミラーAPI連携
- データ同期機能
- 統合管理画面

**開発項目**:
1. セル紙ミラーAPI仕様確認・実装
2. データ同期バッチ処理
3. エラーハンドリング・リトライ機能
4. 連携状況監視機能

### フェーズ6: 高度機能・最適化
**期間**: 2-3週間
**成果物**:
- 画像自動処理
- 一括操作機能
- レポート・分析機能

**開発項目**:
1. 画像自動リサイズ・最適化
2. セット商品画像自動合成
3. 一括出品・更新機能
4. 出品パフォーマンス分析
5. エラーログ・監視システム

## 8. 技術仕様

### 8.1 技術スタック
- **フロントエンド**: React.js + TypeScript
- **バックエンド**: Node.js + Express / Python Django
- **データベース**: PostgreSQL
- **ファイルストレージ**: AWS S3
- **API**: eBay Trading API + Inventory API
- **認証**: OAuth 2.0 (eBay)

### 8.2 パフォーマンス要件
- API レスポンス時間: 3秒以内
- 大量商品処理: 1000商品の一括処理対応
- 同時接続: 10ユーザー以上
- 稼働率: 99.9%以上

### 8.3 セキュリティ要件
- eBay APIトークンの安全な管理
- 商品データの暗号化
- アクセスログの記録
- 定期的なバックアップ

## 9. テスト戦略

### 9.1 単体テスト
- フロントエンド: Jest + React Testing Library
- バックエンド: Jest (Node.js) / PyTest (Python)
- カバレッジ: 80%以上

### 9.2 統合テスト
- API連携テスト
- データベース結合テスト
- eBay API連携テスト（Sandbox環境）

### 9.3 E2Eテスト
- 出品フロー全体のテスト
- ユーザーシナリオベースのテスト
- 複数ブラウザ対応テスト

## 10. 運用・保守

### 10.1 監視項目
- eBay API呼び出し成功率
- 出品成功率
- システムエラー率
- レスポンス時間

### 10.2 ログ管理
- API呼び出しログ
- エラーログ
- ユーザー操作ログ
- パフォーマンスログ

### 10.3 バックアップ・復旧
- 日次データベースバックアップ
- 商品画像のバックアップ
- 障害時の復旧手順

## 11. リスク管理

### 11.1 技術的リスク
- **eBay API仕様変更**: API バージョン管理とフォールバック実装
- **大量データ処理**: バッチ処理とキューイングシステム
- **パフォーマンス劣化**: 定期的な性能測定と最適化

### 11.2 ビジネスリスク
- **eBayポリシー変更**: 定期的なポリシー確認と対応
- **競合他社**: 差別化機能の継続開発
- **ユーザー要求変化**: アジャイル開発による柔軟な対応

## 12. 成功指標（KPI）

### 12.1 機能面
- 出品作業時間の50%以上短縮
- 出品エラー率1%以下
- ユーザー満足度4.5/5.0以上

### 12.2 技術面
- システム稼働率99.9%以上
- API レスポンス時間3秒以内
- データ整合性エラー0.1%以下

### 12.3 ビジネス面
- 月間出品数の30%増加
- 在庫回転率の向上
- オペレーションコストの削減

---

この開発指示書に基づいて段階的に開発を進めることで、実用性の高いeBay出品ツールの構築が可能です。各フェーズの完了時点で実際の運用テストを行い、フィードバックを次のフェーズに反映させることを推奨します。