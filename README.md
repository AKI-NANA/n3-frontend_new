# n3-frontend_new

**マルチツール統合開発環境（eBay出品自動化システム）**

---

## 🚀 クイックスタート

### **前提条件**
- Node.js 18以上
- npm または yarn
- Supabase アカウント

### **インストール**
```bash
# リポジトリをクローン
git clone <repository-url>
cd n3-frontend_new

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.local を編集して必要な環境変数を設定

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開く

---

## 📚 ドキュメント

| ドキュメント | 説明 |
|------------|------|
| [PROJECT_MAP.md](./PROJECT_MAP.md) | **必読**: 完全プロジェクトマップ |
| [docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) | プロジェクト概要 |
| [IMPORTANT_NOTES.md](./IMPORTANT_NOTES.md) | 重要な注意事項 |
| [database/SUPABASE_SETUP_GUIDE.md](./database/SUPABASE_SETUP_GUIDE.md) | DB設定ガイド |

---

## 🛠️ 利用可能なコマンド
```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 本番サーバー起動
npm start

# Lint チェック
npm run lint

# 型チェック
npx tsc --noEmit
```

---

## 🔧 主要な技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript
- **スタイリング**: Tailwind CSS, shadcn/ui
- **データベース**: Supabase (PostgreSQL)
- **認証**: カスタム認証 + JWT
- **API連携**: eBay API, SellerMirror API

---

## 📂 プロジェクト構造
```
n3-frontend_new/
├── app/                 # Next.js App Router
│   ├── api/            # API Routes
│   ├── tools/          # 各ツール画面
│   └── login/          # 認証画面
├── components/         # 共通コンポーネント
├── contexts/           # React Context
├── lib/                # ビジネスロジック
├── types/              # TypeScript型定義
├── database/           # DB関連ドキュメント
└── docs/               # ドキュメント
```

詳細は [PROJECT_MAP.md](./PROJECT_MAP.md) を参照

---

## 👨‍💻 開発ガイド

### **新しいツールを追加する**
1. `app/tools/[tool-name]/page.tsx` を作成
2. 必要に応じて `app/api/[tool-name]/` にAPIを作成
3. `lib/[tool-name]/` にビジネスロジックを配置
4. `PROJECT_MAP.md` を更新

### **コーディング規約**
- TypeScriptの型定義を必ず記述
- ESLintのルールに従う
- コンポーネントは機能単位で分割

詳細は [IMPORTANT_NOTES.md](./IMPORTANT_NOTES.md) を参照

---

## 🐛 トラブルシューティング

問題が発生した場合:
1. [IMPORTANT_NOTES.md](./IMPORTANT_NOTES.md) の「よくあるエラー」を確認
2. ブラウザのコンソールをチェック
3. `npm install` を再実行
4. それでも解決しない場合は Issue を作成

---

## 📝 ライセンス

Private - All Rights Reserved

---

**最終更新**: 2025-10-21
# Auto-deploy test
