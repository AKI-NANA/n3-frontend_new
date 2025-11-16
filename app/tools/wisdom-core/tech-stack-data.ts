// 技術スタック情報
export const TECH_STACK_DOC = `# n3-frontend システム技術スタック

## 🏗️ 使用技術

### フロントエンド
- **Next.js 15.5.4** (App Router)
- **React 19.1.0**
- **TypeScript 5.x**
- **TailwindCSS 4.x**
- **shadcn/ui**

### バックエンド
- **Supabase** (PostgreSQL)
  - URL: \`https://zdzfpucdyxdlavkgrvil.supabase.co\`
  - DB: \`products_master\`
- **eBay API**
- **Puppeteer**

### 状態管理
- **Zustand**
- **TanStack Query**
- **Supabase Realtime**

---

## 📁 ファイル保存先ルール

| 種類 | 保存先 | 例 |
|------|--------|-----|
| 新しいページ | \`app/[機能名]/page.tsx\` | \`app/dashboard/page.tsx\` |
| 新しいツール | \`app/tools/[名前]/page.tsx\` | \`app/tools/buyma/page.tsx\` |
| API | \`app/api/[機能]/route.ts\` | \`app/api/ebay/route.ts\` |
| UIコンポーネント | \`components/ui/\` | \`components/ui/button.tsx\` |
| 機能コンポーネント | \`components/features/\` | \`components/features/ProductCard.tsx\` |
| **サイドバーメニュー** | **\`components/layout/SidebarConfig.ts\`** | **(唯一・最重要)** |
| DB操作 | \`lib/supabase.ts\` | (Supabase接続) |
| API呼び出し | \`lib/[api名]-api.ts\` | \`lib/ebay-api.ts\` |
| ビジネスロジック | \`services/[機能]Service.ts\` | \`services/productService.ts\` |
| 型定義 | \`types/[機能].ts\` | \`types/product.ts\` |
| DBスキーマ | \`database/schema.sql\` | (メインスキーマ) |
| マイグレーション | \`database/migrations/\` | \`001_add_hts.sql\` |

---

## 🎯 新機能追加の手順

### 1. ページ作成
\`\`\`
app/[機能名]/page.tsx
\`\`\`

### 2. サイドバー追加 ⭐重要
\`\`\`typescript
// components/layout/SidebarConfig.ts
{
  id: "new-category",
  label: "新カテゴリ",
  icon: "tool",
  priority: 10,
  submenu: [
    { 
      text: "新ツール", 
      link: "/tools/new-tool", 
      icon: "zap", 
      status: "ready", 
      priority: 1 
    }
  ]
}
\`\`\`

### 3. 必要に応じて
- コンポーネント: \`components/features/\`
- API: \`app/api/\`
- 型: \`types/\`
- DB: \`database/migrations/\`

---

## 📊 主要DBテーブル

### products_master
\`\`\`sql
- id: UUID
- title: TEXT
- price: NUMERIC
- status: TEXT
- ebay_category_id: TEXT
- hts_code: TEXT
- created_at: TIMESTAMPTZ
\`\`\`

### hts_chapters
\`\`\`sql
- chapter_id: INTEGER
- description_en: TEXT
- description_ja: TEXT
\`\`\`

### ebay_categories
\`\`\`sql
- category_id: TEXT
- name: TEXT
- parent_id: TEXT
\`\`\`

---

## 🔧 最重要ファイル

### 1. components/layout/SidebarConfig.ts ⭐
- **役割**: サイドバーメニュー管理
- **修正時**: 新ツール追加時に必ず編集
- **注意**: 唯一のメニュー管理ファイル

### 2. lib/supabase.ts
- **役割**: Supabase接続
- **修正時**: 全DB操作の起点

### 3. tsconfig.json
- **役割**: パスエイリアス設定
- **設定**: \`@/\` = ルートディレクトリ

### 4. .env.local
- **役割**: 環境変数
- **内容**: Supabase/eBay APIキー

---

## 🚨 よくある問題と解決法

### ページが表示されない
1. \`app/[パス]/page.tsx\` が存在するか
2. \`'use client'\` ディレクティブがあるか
3. \`export default function\` になっているか

### importエラー
1. \`@/\` パスエイリアスが使えているか
2. \`tsconfig.json\` の \`paths\` 設定を確認

### Supabase接続エラー
1. \`.env.local\` にキーが設定されているか
2. \`lib/supabase.ts\` を使用しているか
3. RLSポリシーが設定されているか

### サイドバーに表示されない
1. \`components/layout/SidebarConfig.ts\` に追加したか
2. \`status: "ready"\` になっているか
3. \`link\` が正しいパスか

---

## 📝 Gemini開発チェックリスト

### 新機能開発
- [ ] \`app/\` にページ配置
- [ ] \`components/\` にUI作成
- [ ] \`lib/\` にロジック配置
- [ ] \`types/\` に型追加
- [ ] **\`components/layout/SidebarConfig.ts\` にメニュー追加** ⭐
- [ ] DB変更時は \`database/migrations/\` に追加

### 既存機能修正
- [ ] 関連ファイルを全て特定
- [ ] 型定義の変更を確認
- [ ] DB変更の必要性を確認
- [ ] サイドバーメニューの更新確認

---

## 💡 1機能修正時の関連ファイル例

### 例: 商品承認機能の修正

関連ファイル:
1. **ページ**: \`app/approval/page.tsx\`
2. **ロジック**: \`services/productService.ts\`
3. **API**: \`app/api/products/approve/route.ts\`
4. **型**: \`types/product.ts\`
5. **コンポーネント**: \`components/features/ProductApprovalModal.tsx\`
6. **メニュー**: \`components/layout/SidebarConfig.ts\` (表示名変更時のみ)

→ これら全てを確認・修正する必要があります

---

## 🎯 Geminiへの効果的な質問例

\`\`\`
このシステム技術スタックドキュメントを読んでから、
以下の機能を実装してください:

【機能名】BUYMA仕入れシミュレーター

【必要な対応】
1. 新しいページ作成
2. Supabase接続
3. サイドバーメニュー追加

【確認事項】
- 関連ファイルは全て作成されていますか?
- SidebarConfig.tsに追加されていますか?
- 型定義は作成されていますか?
\`\`\`
`
