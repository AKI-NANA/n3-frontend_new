# 楽天せどり 高度選定ツール v2.0

## 概要

楽天せどりにおける最適な仕入れ判断を支援する、統合的な意思決定支援ツールです。

### 主な機能

1. **ポイント倍率計算** - SPU倍率を考慮した実質仕入れ値の算出
2. **Amazon出品可否チェック** - SP-API模擬による制限ASIN判定
3. **利益率分析** - 純利益と利益率の自動計算
4. **回転率判定** - BSRに基づく売れ行き予測
5. **仕入れルート追跡** - 優良店舗・カテゴリのURL管理
6. **販売実績記録** - 過去の仕入れデータの蓄積

## セットアップ

### 1. Supabaseテーブルの作成

Supabaseダッシュボードの SQL Editor で `supabase-schema.sql` を実行してください。

これにより、以下のテーブルが作成されます:
- `arbitrage_tracked_routes` - 仕入れルート管理
- `arbitrage_sales_records` - 販売実績
- `arbitrage_settings` - ユーザー設定
- `arbitrage_products` - 商品データ（オプション）

### 2. 環境変数の確認

`.env.local` に以下の環境変数が設定されていることを確認してください:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. アクセス

ツールへは以下のURLでアクセスできます:
```
http://localhost:3000/tools/rakuten-arbitrage
```

## 使い方

### 基本設定

1. **SPU倍率** - 楽天スーパーポイントアッププログラムの倍率を入力（例: 12%）
2. **最低利益率** - 仕入れ候補に含める最低利益率（例: 15%）
3. **最大BSR** - 仕入れ候補に含める最大BSRランク（例: 20000）

### 仕入れルート管理

- **追加**: 店舗名/カテゴリ名とURLを入力して「追加」ボタンをクリック
- **削除**: 登録済みルートの「削除」ボタンをクリック
- **活用**: URLをクリックして該当ページに直接アクセス

### 出品可否チェック

1. ASINを入力フィールドに入力
2. 「チェック」ボタンをクリック
3. 模擬結果が表示されます

**注意**: この機能はAmazon SP-APIの応答を模擬しています。正確な出品可否は、Amazonセラーセントラルで最終確認してください。

### 仕入れ候補リスト

- **表示順**: 純利益の高い順に自動ソート
- **仕入れ実行**: ボタンをクリックすると販売実績に記録され、リストから削除
- **見送り**: ボタンをクリックするとリストから削除

### 販売実績

過去10件の仕入れ実績が表示されます:
- ASIN
- 商品名
- 純利益
- 購入日

## データ構造

### Product（商品データ）

```typescript
{
  asin: string;              // Amazon ASIN
  productName: string;       // 商品名
  rakutenPrice: number;      // 楽天価格
  amazonNetRevenue: number;  // Amazon純収益
  currentBSR: number;        // 現在のBSR
  effectiveRakutenPrice: number; // 実質仕入れ値
  netProfit: number;         // 純利益
  profitRate: number;        // 利益率
  isEligible: boolean;       // 出品可否
  purchaseStatus: 'pending' | 'bought' | 'skipped';
}
```

### Settings（設定）

```typescript
{
  spuMultiplier: number;     // SPU倍率 (%)
  minProfitRate: number;     // 最低利益率 (0.15 = 15%)
  maxBSR: number;            // 最大BSR
}
```

## 計算ロジック

### 実質仕入れ値

```
実質仕入れ値 = 楽天価格 × (1 - SPU倍率 / 100)
```

例: 楽天価格 10,000円、SPU倍率 12%
```
実質仕入れ値 = 10,000 × (1 - 12/100) = 8,800円
```

### 純利益

```
純利益 = Amazon純収益 - 実質仕入れ値
```

### 利益率

```
利益率 = 純利益 / Amazon純収益
```

## フィルタリング条件

仕入れ候補リストに表示されるのは、以下の条件をすべて満たす商品です:

1. ✅ 購入ステータスが「pending」
2. ✅ Amazon出品可能（isEligible = true）
3. ✅ BSRが最大BSR以下
4. ✅ 利益率が最低利益率以上

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **データベース**: Supabase (PostgreSQL)
- **スタイリング**: Tailwind CSS
- **状態管理**: React Hooks (useState, useEffect, useMemo)
- **アイコン**: Font Awesome

## トラブルシューティング

### データが保存されない

1. Supabaseテーブルが正しく作成されているか確認
2. RLS (Row Level Security) ポリシーが適用されているか確認
3. ブラウザのコンソールでエラーメッセージを確認

### 仕入れ候補が表示されない

1. 基本設定の条件が厳しすぎないか確認
2. 商品データが正しく読み込まれているか確認
3. フィルタリング条件を緩和してみる

## 今後の拡張予定

- [ ] 実際の楽天APIとの連携
- [ ] Amazon SP-API本番接続
- [ ] 商品の自動スクレイピング
- [ ] 利益予測グラフの表示
- [ ] CSVエクスポート機能
- [ ] 複数ユーザー対応の強化

## ライセンス

内部使用のみ

## サポート

問題が発生した場合は、プロジェクトの開発チームに連絡してください。
