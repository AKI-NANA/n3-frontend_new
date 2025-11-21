# 受注管理システム V2.0 - OrderManager_V2

多モール対応の受注データ一元管理システムです。AI機能を活用した顧客対応メール作成とリスク分析機能を備えています。

## 📋 主な機能

### ✅ 実装済み機能

1. **多モール対応**
   - eBay, Shopee, Coupang, BUYMA, Qoo10, Amazon, Shopify, メルカリ対応
   - モール別のフィルタリング機能

2. **受注データ管理**
   - 仕入れ値、利益率、AIスコアの表示
   - リアルタイムでのステータス管理
   - 詳細パネルでの注文情報表示

3. **AI機能 (Gemini API統合)**
   - 🤖 **AI顧客対応メール作成**: 顧客からの問い合わせに基づいて、適切な返信メールを自動生成
   - 🔍 **AIトラブル/リスク分析**: 注文情報を分析し、潜在的なトラブル要因と対応策を提案

4. **フィルタリング & ソート**
   - 注文ID、商品名、日付、モール、ステータスでフィルタリング
   - AIスコア、利益率、注文日でソート

5. **UIデザイン**
   - Tailwind CSSによるモダンなデザイン
   - レスポンシブ対応
   - カスタムモーダル（alert/confirm禁止）

## 🚀 セットアップ手順

### 1. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here

# Google Gemini API Configuration
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Gemini API キーの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. "Get API Key" をクリック
4. 生成されたAPIキーを `.env.local` の `NEXT_PUBLIC_GEMINI_API_KEY` に設定

### 3. Firebase プロジェクトの設定

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新規プロジェクトを作成（または既存のプロジェクトを使用）
3. プロジェクト設定から「ウェブアプリを追加」
4. 表示された設定情報を `.env.local` に追加
5. Firestore Database を有効化

### 4. アプリケーションの起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000/management/orders/v2` にアクセスします。

## 📊 データモデル

### Order オブジェクト

```typescript
{
  id: string;              // 注文番号 (例: 'EB001-20241213')
  date: string;            // 注文日時
  mall: string;            // 販売チャネル ('eBay', 'Shopee', etc.)
  product: string;         // 商品名
  sku: string;             // SKUコード
  totalAmount: number;     // 販売価格
  costPrice: number;       // 仕入れ値
  expectedProfit: number;  // 予想利益
  profitRate: number;      // 利益率 (%)
  paymentStatus: string;   // 支払いステータス
  shippingStatus: string;  // 出荷ステータス
  aiScore: number;         // AIスコア (0-100)
  country: string;         // 配送先国
  deadline: string;        // 出荷期限
  imageUrl?: string;       // 商品画像URL
}
```

## 🤖 AI機能の使い方

### AI顧客対応メール作成

1. 受注一覧から注文を選択
2. 詳細パネルで「AI顧客メール作成」ボタンをクリック
3. 顧客からの問い合わせ内容を入力
4. 「AIメールを生成」をクリック
5. 生成されたメールドラフトを確認し、必要に応じて編集

### AIトラブル/リスク分析

1. 受注一覧から注文を選択（特にAIスコアが70以下の高リスク注文）
2. 詳細パネルで「AIトラブル分析」ボタンをクリック
3. AIが潜在的なトラブル要因を3点分析し、対応策を提案
4. 分析結果をコピーして社内で共有可能

## 🔧 技術スタック

- **React**: コンポーネントベースのUI
- **Firebase**: 認証とデータベース (Firestore)
- **Google Gemini API**: AI機能 (gemini-2.0-flash-exp)
- **Tailwind CSS**: スタイリング
- **Next.js**: フレームワーク

## ⚙️ 設定のカスタマイズ

### AI モデルの変更

`OrderManager_V2.jsx` の先頭で以下の定数を変更できます:

```javascript
const GEMINI_MODEL = "gemini-2.0-flash-exp"; // 使用するモデル
```

利用可能なモデル:
- `gemini-2.0-flash-exp` (推奨: 高速で低コスト)
- `gemini-1.5-pro` (高精度)
- `gemini-1.5-flash` (バランス型)

### モールの追加

`ALL_MALLS` 配列に新しいモールを追加:

```javascript
const ALL_MALLS = ['eBay', 'Shopee', 'Coupang', 'BUYMA', 'Qoo10', 'Amazon', 'Shopify', 'メルカリ', 'その他', '新しいモール'];
```

## 🛠 トラブルシューティング

### AI機能が動作しない場合

1. **APIキーの確認**
   - `.env.local` に `NEXT_PUBLIC_GEMINI_API_KEY` が正しく設定されているか確認
   - APIキーが有効か確認（[Google AI Studio](https://makersuite.google.com/app/apikey)）

2. **ブラウザのコンソールを確認**
   - F12でデベロッパーツールを開き、エラーメッセージを確認
   - CORS エラーが出ている場合は、Gemini APIの設定を確認

3. **API制限の確認**
   - Gemini APIの無料枠を超過していないか確認
   - レート制限に達していないか確認

### Firebaseの接続エラー

1. Firebase設定が正しいか確認
2. Firestoreのセキュリティルールを確認
3. 認証が有効になっているか確認

## 📝 制約事項

- シングルファイル構造を維持（外部ファイルへの分割禁止）
- `alert()`, `confirm()` の使用禁止（カスタムモーダルを使用）
- 全てのスタイリングはTailwind CSSのインラインクラスで実装

## 🔄 今後の拡張予定

- [ ] メール送信機能の統合
- [ ] 配送ラベル印刷機能
- [ ] 在庫管理との連携
- [ ] 多言語対応
- [ ] エクスポート機能（CSV, Excel）

## 📄 ライセンス

プロジェクト内部使用

## 👥 開発者向け情報

### コードの構造

- **Firebase初期化**: 6-26行目
- **Gemini API統合**: 33-76行目
- **データモデル**: 83-113行目
- **メインコンポーネント**: 149-682行目
- **AI機能**: 259-482行目
- **UI コンポーネント**: 487-682行目

### デバッグモード

開発中は、ブラウザのコンソールにログが出力されます。本番環境では `console.log` を削除してください。

---

**作成日**: 2024-12-19
**バージョン**: 2.0
**最終更新**: 2024-12-19
