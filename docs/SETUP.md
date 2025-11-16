# 🚀 セットアップ手順

## 1. 依存パッケージのインストール

```bash
cd /Users/aritahiroaki/n3-frontend_new
npm install
```

## 2. 環境変数の設定

`.env.local` ファイルを編集してSupabaseのANON_KEYを設定：

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのANON_KEYをここに入力
```

**ANON_KEYの取得方法:**
1. https://supabase.com/dashboard にアクセス
2. プロジェクト（zdzfpucdyxdlavkgrvil）を選択
3. Settings → API
4. `anon` `public` キーをコピー

## 3. 開発サーバーの起動

```bash
npm run dev
```

## 4. アクセス

ブラウザで以下にアクセス：
- ホーム: http://localhost:3000
- 在庫・価格管理: http://localhost:3000/inventory-pricing

---

## ✅ 作成されたファイル

```
/Users/aritahiroaki/n3-frontend_new/
├── app/
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # ホームページ
│   ├── globals.css             # グローバルCSS
│   ├── inventory-pricing/
│   │   └── page.tsx           # 在庫・価格管理画面
│   └── api/
│       ├── inventory-monitoring/execute/
│       └── price-changes/approve/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # クライアント用Supabase
│   │   └── server.ts          # サーバー用Supabase
│   └── pricing-engine/
│       ├── index.ts
│       ├── calculator.ts
│       ├── rule-engine.ts
│       └── types.ts
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.mjs
└── .env.local                 # 環境変数（要設定）
```

---

## 🔧 トラブルシューティング

### ページが404になる場合
1. 開発サーバーを再起動
   ```bash
   # Ctrl+C で停止
   npm run dev
   ```

2. `.next` ディレクトリを削除して再ビルド
   ```bash
   rm -rf .next
   npm run dev
   ```

### Supabaseエラーが出る場合
- `.env.local` のANON_KEYが正しく設定されているか確認
- 環境変数を変更した場合は開発サーバーを再起動

### スタイルが適用されない場合
- Tailwind CSSが正しくインストールされているか確認
   ```bash
   npm list tailwindcss
   ```

---

## 📝 次のステップ

1. `.env.local` にANON_KEYを設定
2. `npm install` を実行
3. `npm run dev` でサーバー起動
4. http://localhost:3000/inventory-pricing にアクセス

準備ができたら教えてください！
