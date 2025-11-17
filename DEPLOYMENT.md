# 🚀 リサーチ分析ダッシュボード デプロイガイド

## 📋 前提条件

- Node.js 18以上
- Supabaseプロジェクト
- （オプション）Vercelアカウント

---

## 🗄️ Step 1: Supabase マイグレーション実行

### 方法1: Supabase Dashboard（推奨・最も簡単）

1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. プロジェクトを選択
3. 左メニュー「SQL Editor」を開く
4. 「New query」をクリック
5. `supabase/migrations/20250117_research_analytics_rpc.sql` の内容をコピペ
6. 「Run」をクリック

### 方法2: 自動スクリプト

```bash
# 実行権限を確認（既に付与済み）
chmod +x scripts/apply-migration.sh

# マイグレーション適用
./scripts/apply-migration.sh
```

### 方法3: Supabase CLI

```bash
# Supabase CLIをインストール
npm install -g supabase

# プロジェクトにリンク
supabase link

# マイグレーション適用
supabase db push
```

---

## 🌐 Step 2: デプロイ

### ✅ オプション1: Vercel（推奨）

#### 初回セットアップ

```bash
# Vercel CLIをインストール
npm install -g vercel

# Vercelにログイン
vercel login

# デプロイ（初回）
vercel
```

#### 環境変数の設定

Vercel Dashboardで以下を設定：

1. https://vercel.com/dashboard
2. プロジェクト選択
3. Settings → Environment Variables
4. 以下を追加：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EBAY_APP_ID=your-ebay-app-id
EBAY_CLIENT_ID_MJT=your-ebay-client-id
EBAY_CLIENT_SECRET_MJT=your-ebay-client-secret
EBAY_REFRESH_TOKEN_MJT=your-ebay-refresh-token
```

#### 本番デプロイ

```bash
vercel --prod
```

#### GitHub連携（自動デプロイ）

1. GitHubリポジトリをVercelにインポート
2. 環境変数を設定
3. 自動的にデプロイされます

---

### 🖥️ オプション2: VPS

```bash
# 1. 環境変数ファイルを作成
cp .env.local.example .env.local
nano .env.local

# 2. ビルド
npm install
npm run build

# 3. 起動（PM2使用）
pm2 start npm --name "n3-frontend" -- start

# または、直接起動
npm start
```

---

### 🏠 オプション3: ローカル開発環境

```bash
# 1. 環境変数ファイルを作成
cp .env.local.example .env.local

# 2. .env.localを編集
nano .env.local

# 3. 開発サーバー起動
npm run dev

# 4. ブラウザで開く
# http://localhost:3000/research-analysis
```

---

## 🔍 Step 3: 動作確認

### アクセスURL

- **Vercel**: `https://your-app.vercel.app/research-analysis`
- **VPS**: `http://your-vps-ip:3000/research-analysis`
- **ローカル**: `http://localhost:3000/research-analysis`

### 確認項目

✅ ページが表示される
✅ フィルタリングが動作する
✅ グラフが表示される（VEROリスク分布、HTSコード頻度、散布図）
✅ KPIカードに統計情報が表示される
✅ データ一覧テーブルが表示される
✅ 詳細モーダルが開く

---

## 🐛 トラブルシューティング

### エラー: "リサーチ統計の取得に失敗しました"

**原因:** RPC関数が作成されていない

**解決策:**
1. Supabase Dashboardで「SQL Editor」を開く
2. マイグレーションSQLを実行

### エラー: "データがありません"

**原因:** `scored_products` テーブルにデータがない

**解決策:**
1. リサーチデータを投入
2. または、テストデータを作成

### エラー: "環境変数が設定されていません"

**原因:** `.env.local` または Vercel環境変数が未設定

**解決策:**
- ローカル: `.env.local` ファイルを確認
- Vercel: Dashboard → Settings → Environment Variables

---

## 📚 参考資料

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Recharts Documentation](https://recharts.org/)

---

## 🎉 完了！

これで、リサーチ分析ダッシュボードが本番環境で利用できます。

ダッシュボードにアクセスして、以下を確認してください：
- リサーチ成功率の可視化
- VEROリスク分布の分析
- HTSコードの頻度分析
- 市場流通数と成功率の相関
- 個別データの詳細表示
