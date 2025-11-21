# 多モール画像最適化エンジン - セットアップと使用方法

## 概要

この機能は、商品画像の自動最適化とモール別のウォーターマーク適用を実現するシステムです。既存の `/tools/editing` 画面の商品詳細モーダル内に統合されており、出品品質の向上と作業効率化を目指します。

## 主な機能

### 1. P1/P2/P3 自動画像生成
- **P1 (Z=1.0)**: オリジナルサイズ
- **P2 (Z=1.15)**: 推奨拡大（デフォルト）
- **P3 (Z=1.30)**: 最大拡大

各バリアントは中心からズームされ、Supabase Storage に自動保存されます。

### 2. カスタムズーム率調整
- スライダーで 1.0 〜 1.3 の間で微調整可能
- SKUマスターの `listing_data` に保存

### 3. モール・アカウント別ウォーターマーク
- モールごとに異なるウォーターマーク設定を管理
- 位置、透過度、サイズを細かく調整可能
- **Amazon例外処理**: Amazonへの出品時は自動的にウォーターマークをスキップ

### 4. リアルタイムプレビュー
- 出品先を選択して、最終的な画像（ズーム + ウォーターマーク）をプレビュー表示

---

## セットアップ手順

### ステップ 1: Supabase データベースのセットアップ

Supabase コンソールの **SQL Editor** を開き、以下のSQLスクリプトを実行してください。

```sql
-- image_rules テーブルを作成
-- ファイル: supabase/schema/image_rules.sql の内容を実行
```

または、以下のコマンドで直接実行できます：

```bash
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f supabase/schema/image_rules.sql
```

### ステップ 2: Supabase Storage のセットアップ

以下のストレージバケットが必要です（既に存在する場合はスキップ）：

1. **inventory-images** - 商品画像とP1/P2/P3の保存先
   - パス: `products/` - 元画像
   - パス: `optimized/` - P1/P2/P3
   - パス: `listings/` - 最終処理済み画像

2. **watermarks** - ウォーターマーク画像の保存先（オプション）

Supabase コンソールの **Storage** セクションで以下を実行：
- 新しいバケットを作成: `inventory-images`
- Public に設定（画像URLを公開する場合）

### ステップ 3: 環境変数の確認

`.env.local` に以下の変数が設定されていることを確認：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### ステップ 4: 依存関係のインストール

Sharp.js は既にインストール済みです。追加のパッケージは不要です。

```bash
npm install
# または
yarn install
```

---

## クイックスタート

### プログラムから使用する場合（推奨）

出品処理に画像最適化を統合する最も簡単な方法：

```typescript
import { enhanceListingWithImageProcessing } from '@/lib/services/image'

// 既存の出品データ
const listing = {
  title: '商品名',
  description: '説明',
  price: 100,
  imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
}

// 画像処理を適用
const enhancedListing = await enhanceListingWithImageProcessing(
  listing,
  product.sku,
  'ebay', // または 'shopee', 'amazon-global' など
  userId,
  product.listing_data?.custom_zoom // オプション
)

// enhancedListing.imageUrls には処理済みのURLが含まれる
await createEbayListing(enhancedListing)
```

これだけで、以下の処理が自動的に実行されます：
- ✅ ズーム率の適用
- ✅ モール別ウォーターマークの合成（Amazonは自動除外）
- ✅ Supabase Storage へのアップロード
- ✅ 最適化された画像URLの取得

---

## 使用方法

### 1. 商品編集モーダルでの使用

1. `/tools/editing` 画面で商品をクリック
2. モーダルが開いたら、**「画像最適化とルール」** タブをクリック
3. メイン画像に対して **「P1/P2/P3を生成」** ボタンをクリック
4. 生成された3つの候補から最適なものを選択
5. 必要に応じてスライダーでズーム率を微調整
6. プレビューエリアで出品先を選択し、最終画像を確認

### 2. ウォーターマーク設定

1. `/settings/image-rules` にアクセス
2. 左側のリストから対象のモールを選択
3. 以下を設定：
   - ウォーターマーク画像のアップロード（PNG推奨）
   - 位置（右下、左上など）
   - 透過度（0〜100%）
   - サイズ（画像の5〜50%）
4. **「設定を保存」** をクリック

### 3. 出品時の自動処理

出品実行時、`processImageForListing()` が自動的に呼ばれ、以下の処理が行われます：

- 選択されたズーム率を適用
- モール別のウォーターマークを合成（Amazonは除外）
- 最終画像を Supabase Storage にアップロード
- 出品データに最終URLを含める

---

## ファイル構成

```
project/
├── supabase/
│   └── schema/
│       └── image_rules.sql              # テーブル定義
│
├── lib/
│   └── services/
│       └── image/
│           ├── ImageProcessorService.ts # コアロジック
│           ├── ImageProcessorIntegration.ts # 統合ヘルパー
│           └── index.ts                 # エクスポート
│
├── components/
│   └── ProductModal/
│       ├── FullFeaturedModal.tsx        # モーダル本体（統合済み）
│       └── components/
│           ├── TabNavigation.tsx        # タブナビゲーション（更新済み）
│           └── Tabs/
│               ├── TabImages.tsx        # 既存の画像選択タブ
│               └── TabImageOptimization.tsx  # 新しい画像最適化タブ
│
├── app/
│   ├── api/
│   │   ├── image-rules/
│   │   │   └── route.ts                 # 画像ルールAPI
│   │   └── image-optimization/
│   │       └── generate-variants/
│   │           └── route.ts             # P1/P2/P3生成API
│   │
│   └── settings/
│       └── image-rules/
│           └── page.tsx                 # ウォーターマーク設定画面
│
└── docs/
    └── IMAGE_OPTIMIZATION_ENGINE.md     # このファイル
```

---

## API リファレンス

### GET `/api/image-rules?marketplace={marketplace}`

**説明**: 指定されたモールの画像ルールを取得

**パラメータ**:
- `marketplace` (string): モールID（例: `ebay`, `shopee`, `amazon-global`）

**レスポンス**:
```json
{
  "id": "uuid",
  "account_id": "user123",
  "marketplace": "ebay",
  "watermark_enabled": true,
  "watermark_image_url": "https://...",
  "watermark_position": "bottom-right",
  "watermark_opacity": 0.8,
  "watermark_scale": 0.15,
  "skip_watermark_for_amazon": true,
  "auto_resize": true,
  "target_size_px": 1600,
  "quality": 90
}
```

### POST `/api/image-rules`

**説明**: 新しい画像ルールを作成

**リクエストボディ**:
```json
{
  "marketplace": "shopee",
  "watermark_enabled": true,
  "watermark_image_url": "https://...",
  "watermark_position": "bottom-right",
  "watermark_opacity": 0.7,
  "watermark_scale": 0.2
}
```

### POST `/api/image-optimization/generate-variants`

**説明**: P1/P2/P3の画像バリアントを生成

**リクエストボディ**:
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "sku": "SKU-12345"
}
```

**レスポンス**:
```json
{
  "success": true,
  "variants": [
    { "variant": "P1", "zoom": 1.0, "url": "https://..." },
    { "variant": "P2", "zoom": 1.15, "url": "https://..." },
    { "variant": "P3", "zoom": 1.3, "url": "https://..." }
  ]
}
```

---

## トラブルシューティング

### Q1: P1/P2/P3の生成に失敗する

**原因**: Sharp.js のインストールが正しくない可能性があります。

**解決策**:
```bash
npm rebuild sharp
# または
yarn add sharp --force
```

### Q2: ウォーターマークが表示されない

**原因**: 画像ルールが正しく設定されていないか、Amazon例外処理が有効になっています。

**解決策**:
1. `/settings/image-rules` で対象モールの設定を確認
2. 「ウォーターマークを有効にする」がチェックされているか確認
3. Amazonの場合は例外処理により自動的に非表示になります

### Q3: Supabase Storage のアップロードに失敗する

**原因**: ストレージバケットが存在しないか、権限がありません。

**解決策**:
1. Supabase コンソールで `inventory-images` バケットを作成
2. RLS (Row Level Security) ポリシーを確認
3. `.env.local` の認証情報を確認

---

## 今後の拡張

以下の機能を追加予定：

- [ ] 複数画像の一括最適化
- [ ] 背景削除機能（AI）
- [ ] カスタムフィルター（明るさ、コントラスト調整）
- [ ] モール別の推奨サイズへの自動調整
- [ ] 画像品質のAI分析とスコアリング

---

## サポート

問題が発生した場合は、以下を確認してください：

1. ブラウザのコンソールログ
2. Next.js サーバーログ
3. Supabase のログ（ダッシュボード > Logs）

それでも解決しない場合は、開発チームにお問い合わせください。
