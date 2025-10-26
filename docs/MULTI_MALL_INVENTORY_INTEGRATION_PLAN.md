# マルチモール統合在庫管理システム - 開発計画書

## 📋 概要

複数のECモールの在庫を統合管理するシステム。各モールのAPIと連携し、リアルタイムで在庫状況を把握・管理する。

## 🎯 対象モール

### ✅ フェーズ1: eBay（実装完了）
- **green アカウント**: 実装済み
- **mjt アカウント**: 実装済み
- **API連携**: eBay Inventory API v1
- **取得データ**: Inventory Items + Offers

### 📅 フェーズ2: その他モール（UI準備完了、API未連携）
- Shopee
- Amazon 海外
- Amazon 日本
- Coupang
- Shopify
- Q10

---

## 🏗️ アーキテクチャ

### データフロー

```
各モールAPI
    ↓
/api/[marketplace]/inventory/list
    ↓
統一フォーマットに変換
    ↓
Frontendに表示
    ↓
（オプション）Supabase DBに保存
```

### 統一データ形式

```typescript
interface InventoryProduct {
  id: string                // 一意のID
  unique_id: string         // MARKETPLACE-ACCOUNT-SKU
  product_name: string      // 商品名
  sku: string              // SKU
  product_type: 'stock' | 'dropship' | 'set' | 'hybrid'

  // 在庫情報
  physical_quantity: number // 物理在庫数
  listing_quantity: number  // 出品数

  // 価格情報
  cost_price: number       // 原価
  selling_price: number    // 販売価格
  currency: string         // 通貨 (USD, JPY)

  // モール情報
  marketplace: 'ebay' | 'shopee' | 'amazon-global' | ...
  account: string          // アカウント識別子

  // 商品詳細
  condition_name: string
  category: string
  images: string[]

  // モール固有データ
  ebay_data?: { ... }
  shopee_data?: { ... }
  ...
}
```

---

## 📂 実装ファイル構成

### API エンドポイント

```
app/api/
├── ebay/
│   └── inventory/
│       └── list/
│           └── route.ts          ✅ 実装完了
├── shopee/
│   └── inventory/
│       └── list/
│           └── route.ts          🔲 未実装
├── amazon/
│   └── inventory/
│       └── list/
│           └── route.ts          🔲 未実装
└── ... (他のモール)
```

### フロントエンド

```
app/zaiko/tanaoroshi/
├── page.tsx                       ✅ 実装完了
├── components/
│   ├── MarketplaceSelector.tsx    ✅ 実装完了
│   ├── ProductCard.tsx            ✅ 実装完了 (eBay対応)
│   ├── StatsHeader.tsx            ✅ 既存
│   ├── FilterPanel.tsx            ✅ 既存
│   └── ...
```

### 型定義

```
types/
└── inventory.ts                    ✅ 更新完了（マルチモール対応）
```

### ライブラリ

```
lib/
├── ebay/
│   ├── token.ts                    ✅ 実装完了
│   └── inventory.ts                ✅ 既存
├── shopee/                         🔲 未作成
├── amazon/                         🔲 未作成
└── ...
```

---

## ✅ フェーズ1 完了事項（eBay連携）

### 1. API実装
- ✅ `/api/ebay/inventory/list` - eBay Inventory Items + Offers取得
- ✅ アカウント選択機能（green/mjt）
- ✅ アクセストークン自動更新 (`lib/ebay/token.ts`)

### 2. UI実装
- ✅ マーケットプレイス選択UI
- ✅ eBayアカウント選択UI（green/mjt）
- ✅ 商品カード（eBayデータ表示対応）
- ✅ 統計情報ヘッダー
- ✅ タブフィルター（全て/在庫あり/在庫なし/少量在庫）
- ✅ 検索機能

### 3. データ取得
- ✅ eBay Inventory Items API (`/sell/inventory/v1/inventory_item`)
- ✅ eBay Offers API (`/sell/inventory/v1/offer`)
- ✅ 両データのマージ処理

---

## 🔧 技術仕様

### eBay API連携詳細

#### 認証
```typescript
// lib/ebay/token.ts
export async function getAccessToken(account: 'mjt' | 'green')
```

- OAuth 2.0 Refresh Token方式
- 環境変数から認証情報取得
  - `EBAY_CLIENT_ID_GREEN`
  - `EBAY_CLIENT_SECRET_GREEN`
  - `EBAY_REFRESH_TOKEN_GREEN`
  - `EBAY_CLIENT_ID_MJT`
  - `EBAY_CLIENT_SECRET_MJT`
  - `EBAY_REFRESH_TOKEN_MJT`

#### データ取得API

**Endpoint 1: Inventory Items**
```
GET https://api.ebay.com/sell/inventory/v1/inventory_item?limit=200
```
取得データ:
- SKU
- 在庫数
- 商品タイトル
- 画像URL
- 寸法・重量
- コンディション

**Endpoint 2: Offers**
```
GET https://api.ebay.com/sell/inventory/v1/offer?limit=200
```
取得データ:
- Offer ID
- Listing ID (出品中のみ)
- 価格
- カテゴリ
- ステータス

---

## 🚀 次のフェーズ

### フェーズ2: Shopee連携

#### 必要な作業
1. **API実装**
   - Shopee API認証実装
   - `/api/shopee/inventory/list` エンドポイント作成
   - 統一フォーマットへの変換

2. **環境変数追加**
   ```
   SHOPEE_PARTNER_ID=xxx
   SHOPEE_PARTNER_KEY=xxx
   SHOPEE_SHOP_ID=xxx
   ```

3. **型定義拡張**
   ```typescript
   shopee_data?: {
     item_id: string
     variation_id: string
     ...
   }
   ```

### フェーズ3: Amazon連携

Amazon SP-API（Selling Partner API）使用

#### 必要な作業
1. **SP-API登録**
   - Developer Console登録
   - アプリケーション作成
   - Refresh Token取得

2. **API実装**
   - `/api/amazon/inventory/list`
   - LWA (Login with Amazon) 認証

3. **環境変数**
   ```
   AMAZON_SP_CLIENT_ID=xxx
   AMAZON_SP_CLIENT_SECRET=xxx
   AMAZON_SP_REFRESH_TOKEN=xxx
   AMAZON_SP_MARKETPLACE_ID=xxx
   ```

### フェーズ4: その他モール
- Coupang
- Shopify
- Q10

---

## 📊 データ同期戦略

### 現在の実装（リアルタイム取得）
- ページ読み込み時にAPI呼び出し
- モール/アカウント切り替え時に再取得
- 手動同期ボタンで即座に最新データ取得

### 将来の拡張案

#### オプション1: DBキャッシュ + 定期同期
```
Cron Job (1時間ごと)
    ↓
各モールAPIから取得
    ↓
Supabase DBに保存
    ↓
Frontend はDBから読み込み
```

**メリット**:
- ページ表示が高速
- API制限回避
- 履歴データ保存可能

**デメリット**:
- データ遅延あり
- DB容量増加

#### オプション2: ハイブリッド（推奨）
```
初回表示: DBキャッシュ (高速)
    ↓
バックグラウンドで最新取得
    ↓
差分があれば更新通知
```

---

## 🔐 セキュリティ

### APIキー管理
- ✅ 全てのAPIキーは`.env.local`で管理
- ✅ Gitにコミットしない（`.gitignore`設定済み）
- ✅ サーバーサイドでのみ使用

### アクセス制限
- 現在: 認証なし（内部ツールのため）
- 将来: 必要に応じてユーザー認証追加

---

## 📝 開発メモ

### eBay特有の注意点
1. **Inventory Item ≠ Listing**
   - Inventory Item: 在庫情報
   - Offer: 価格・出品設定
   - Listing: 実際に公開されている出品（Offer公開後に作成）

2. **APIレート制限**
   - 1日5,000リクエスト
   - 実装: リクエスト間隔を空ける、キャッシュ活用

3. **SKU管理**
   - eBayのSKUは出品者が自由に設定
   - 他モールと重複する可能性あり
   - `unique_id`で一意性を保証

### データ整合性
- 各モールで商品情報の粒度が異なる
- 統一フォーマットでは最大公約数的な項目のみ保持
- モール固有データは`[marketplace]_data`フィールドに格納

---

## 🧪 テスト計画

### 手動テスト
1. ✅ eBay green アカウントからデータ取得
2. ✅ eBay mjt アカウントからデータ取得
3. ✅ 全アカウント表示
4. ✅ 検索フィルター
5. ✅ タブ切り替え
6. 🔲 Shopee連携
7. 🔲 Amazon連携

### 自動テスト（将来）
- APIエンドポイントの単体テスト
- データ変換ロジックのテスト
- モック環境での統合テスト

---

## 📚 参考資料

### eBay API
- [eBay Inventory API Documentation](https://developer.ebay.com/api-docs/sell/inventory/overview.html)
- [OAuth 2.0](https://developer.ebay.com/api-docs/static/oauth-tokens.html)

### 他のモールAPI（今後）
- Shopee Open Platform
- Amazon SP-API
- Coupang Open API
- Shopify Admin API

---

## 🎯 次のアクション

### すぐに実行可能
1. **VPS環境変数確認**
   ```bash
   cat ~/n3-frontend_new/.env.local | grep EBAY
   ```

2. **eBay連携テスト**
   - https://n3.emverze.com/zaiko/tanaoroshi にアクセス
   - eBay greenアカウントを選択
   - データが表示されるか確認

3. **デプロイ**
   - ローカル→Gitプッシュ
   - VPSで`git pull` + `npm run build` + `pm2 restart`

### 今後の拡張
1. Shopee API調査・実装
2. Amazon SP-API登録・実装
3. DBキャッシュ機能追加
4. 在庫変更履歴の記録

---

## 💡 FAQ

**Q: なぜSupabaseのDBを使わないの？**
A: 現時点ではリアルタイム性を優先。将来的にキャッシュとして使用予定。

**Q: 他のツールで出品したものは表示される？**
A: はい。eBay Inventory APIは全てのInventory Itemを返すため、手動で出品したものも表示されます。

**Q: 在庫数を変更できる？**
A: 現在は表示のみ。今後、在庫更新APIも実装予定。

**Q: セット商品は？**
A: eBay Multi-SKU Listingには対応していないため、現時点では個別商品のみ。

---

**更新日**: 2025-10-26
**バージョン**: 1.0
**作成者**: Claude Code
