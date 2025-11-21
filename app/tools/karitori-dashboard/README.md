# Amazon刈り取り自動選定・自動購入プロトタイプ

## 概要

このプロトタイプは、Amazon刈り取りビジネスにおける「利益率」「回転率」「スピード」の3要素を最適化し、チャンス商品を自動で選定・通知するシステムです。

特に、**「通知が来た時には売り切れ」**という課題に対応するため、自動購入の判断ロジックを強化しています。

## 主要機能

### 1. 自動購入判定ロジック（AND条件）

以下の2つの条件を**両方**満たす商品のみを自動購入対象とします：

- **利益率**: 20%超
- **BSR（Best Sellers Rank）順位**: 5000位以下（回転率が高い）

### 2. P3戦略: 廃盤・希少性高騰カテゴリ管理

長期的なデータ蓄積のため、以下の機能を提供します：

- カテゴリ/メーカーの登録・削除
- 高騰実績回数の追跡
- 検索キーワードの管理

### 3. アラート管理

- リアルタイムでのアラート一覧表示
- 自動購入シミュレーション
- 手動見送り機能
- 判定理由の表示（NG理由の明示）

## アーキテクチャ

### バックエンド

- **サービス層**: `/lib/services/arbitrage/karitori_dashboard.ts`
  - `KaritoriDashboardService`: ビジネスロジックを実装
  - Firestore連携: `white_list_categories`、`karitori_alerts` コレクション
  - 自動購入判定ロジック

### フロントエンド

- **UIコンポーネント**: `/app/tools/karitori-dashboard/page.tsx`
  - React + Next.js (App Router)
  - Tailwind CSS + Shadcn/ui コンポーネント
  - リアルタイムデータ更新

### データベース

Firestoreコレクション構造:

```
white_list_categories/
  - categoryName: string
  - searchKeyword: string
  - manufacturer: string
  - highProfitsCount: number
  - createdAt: Timestamp

karitori_alerts/
  - asin: string
  - productName: string
  - alertedPrice: number
  - profitRate: number (0.25 = 25%)
  - currentBSR: number
  - purchaseStatus: 'pending' | 'auto-bought' | 'manual-skipped'
  - skipReason?: string
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

## 使用方法

### 1. アプリケーションの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000/tools/karitori-dashboard` にアクセス

### 2. サンプルデータの追加（初回のみ）

1. ダッシュボード上部の「サンプルデータを追加」ボタンをクリック
2. 3件のアラートと2件のサンプルカテゴリが自動で追加されます

### 3. P3カテゴリの管理

**カテゴリの追加:**

1. 「カテゴリ名」「検索キーワード」「メーカー名（任意）」を入力
2. 「カテゴリを登録」ボタンをクリック

**カテゴリの削除:**

1. カテゴリ一覧の各行にある「削除」ボタンをクリック
2. 確認ダイアログで「OK」を選択

### 4. 自動購入シミュレーション

**判定を実行:**

1. アラート一覧で「判定待ち」ステータスの商品を確認
2. 「判定」ボタンをクリック
3. 自動的に利益率とBSRを評価し、結果を表示

**手動見送り:**

1. 自動判定を使わずに手動で見送りたい場合
2. 「見送り」ボタンをクリック

## 実装済み機能

- ✅ Next.js/React用のサービスクラス実装
- ✅ Firestore完全連携（CRUD操作）
- ✅ P3カテゴリ管理UI
- ✅ アラート一覧表示
- ✅ 自動購入判定ロジック（利益率 AND BSR）
- ✅ ステータス色分け表示
- ✅ 判定理由の表示
- ✅ シミュレーションデータの生成機能

## 今後の拡張予定

- [ ] 実際の自動購入API連携（`/api/auto-buy`）
- [ ] リアルタイムアラート通知
- [ ] カテゴリごとの高騰実績レポート
- [ ] BSRランクの履歴グラフ
- [ ] Amazon PA-API連携による商品情報の自動取得
- [ ] 購入履歴の分析ダッシュボード

## シミュレーションテストケース

実装済みの3つのテストケース:

1. **ケース1: 利益率NG**
   - 利益率: 15%（NG）
   - BSR: 2000位（OK）
   - 結果: 手動見送り

2. **ケース2: BSR超過**
   - 利益率: 25%（OK）
   - BSR: 6000位（NG）
   - 結果: 手動見送り

3. **ケース3: 自動購入OK**
   - 利益率: 22%（OK）
   - BSR: 3000位（OK）
   - 結果: 自動購入実行

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **データベース**: Firebase Firestore
- **UI**: React 19 + Tailwind CSS + Shadcn/ui
- **状態管理**: React Hooks (useState, useEffect)
- **アイコン**: Lucide React

## セキュリティ考慮事項

- Firebase認証を使用（匿名認証またはカスタムトークン）
- Firestoreセキュリティルールの設定が必要
- 自動購入APIへのアクセス制御

## トラブルシューティング

### Firebaseエラー

```
Firebase Initialization/Authentication Failed
```

**解決方法**:
- `.env.local`にFirebase設定が正しく記載されているか確認
- `initializeFirebase()`が正常に完了しているか確認

### データが表示されない

**解決方法**:
- Firestoreコレクション名が正しいか確認（`white_list_categories`, `karitori_alerts`）
- ブラウザのコンソールでエラーログを確認
- 「サンプルデータを追加」ボタンでテストデータを追加

## ライセンス

Private - 社内プロトタイプ

## 開発者

Claude AI + Human Developer

## 更新履歴

- **v1.0.0** (2025-11-21): 初回リリース
  - 基本的なCRUD機能
  - 自動購入判定ロジック
  - P3カテゴリ管理機能
  - シミュレーションデータ生成
