# n3-frontend システム技術スタック＆開発ガイド

## 🏗️ システムアーキテクチャ

### フロントエンド
- **Next.js 15.5.4** (App Router)
- **React 19.1.0**
- **TypeScript 5.x**
- **TailwindCSS 4.x**
- **shadcn/ui** (UIコンポーネント)

### バックエンド・データベース
- **Supabase** (PostgreSQL + Auth + Realtime)
  - URL: `https://zdzfpucdyxdlavkgrvil.supabase.co`
  - メインDB: `products_master`
- **eBay API** (Browse, Finding, Trading)
- **Puppeteer** (スクレイピング)

### 状態管理・データフェッチ
- **Zustand** (グローバル状態管理)
- **TanStack Query** (@tanstack/react-query)
- **Supabase Realtime** (リアルタイムDB購読)

---

## 📁 ディレクトリ構造＆保存先

### `/app` - Next.jsページ（最重要）
```
app/
├── (root)/
│   ├── page.tsx           → トップページ
│   ├── dashboard/         → ダッシュボード
│   ├── data-collection/   → データ取得
│   └── approval/          → 商品承認
├── tools/                 → 独立ツール（95+個）
│   ├── editing/          → データ編集ツール
│   ├── hts-classification/ → HTS分類
│   ├── buyma-simulator/   → BUYMA仕入れ
│   └── ...
├── api/                   → APIエンドポイント
│   ├── ebay/             → eBay API連携
│   ├── scraping/         → スクレイピング
│   └── supabase/         → Supabase操作
└── layout.tsx            → 共通レイアウト
```

**保存先ルール:**
- **新しいページ** → `app/[機能名]/page.tsx`
- **新しいツール** → `app/tools/[ツール名]/page.tsx`
- **API** → `app/api/[機能名]/route.ts`

---

### `/components` - 再利用可能なコンポーネント
```
components/
├── ui/                    → shadcn/ui基本コンポーネント
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── layout/               → レイアウト関連
│   ├── Sidebar.tsx       → サイドバー
│   ├── SidebarConfig.ts  → メニュー設定（重要！）
│   └── Header.tsx
├── features/             → 機能別コンポーネント
│   ├── ProductCard.tsx
│   ├── PriceCalculator.tsx
│   └── ...
└── shared/               → 共通UI
    ├── LoadingSpinner.tsx
    └── ErrorBoundary.tsx
```

**保存先ルール:**
- **基本UI** → `components/ui/`
- **ページ固有** → そのページディレクトリ内
- **複数ページで共有** → `components/features/`

---

### `/lib` - ユーティリティ関数
```
lib/
├── supabase.ts           → Supabase接続（重要！）
├── ebay-api.ts           → eBay API関数
├── utils.ts              → 汎用関数
├── constants.ts          → 定数定義
└── calculations/         → 計算ロジック
    ├── pricing.ts        → 価格計算
    ├── shipping.ts       → 送料計算
    └── profit.ts         → 利益計算
```

**保存先ルール:**
- **DB操作** → `lib/supabase.ts`
- **API呼び出し** → `lib/[api名]-api.ts`
- **計算ロジック** → `lib/calculations/`

---

### `/types` - TypeScript型定義
```
types/
├── database.types.ts     → Supabase自動生成型
├── product.ts            → 商品関連型
├── ebay.ts              → eBay関連型
└── index.ts             → エクスポート
```

**保存先ルール:**
- **DB型** → `types/database.types.ts` (自動生成)
- **新しい型** → `types/[機能名].ts`

---

### `/services` - ビジネスロジック
```
services/
├── productService.ts     → 商品管理
├── pricingService.ts     → 価格管理
├── inventoryService.ts   → 在庫管理
└── ebayService.ts        → eBay連携
```

**保存先ルール:**
- **複雑なビジネスロジック** → `services/`
- **APIとDBの橋渡し**

---

### `/database` - データベーススキーマ
```
database/
├── schema.sql            → 全テーブル定義
├── migrations/           → マイグレーション
│   ├── 001_initial.sql
│   └── 002_add_hts.sql
└── seed/                 → 初期データ
    └── categories.sql
```

**保存先ルール:**
- **新しいテーブル** → `database/migrations/XXX_description.sql`
- **スキーマ変更** → 新しいマイグレーションファイル

---

### `/data` - マスターデータ
```
data/
├── categories.json       → カテゴリマスター
├── hts-codes.json        → HTS分類コード
└── shipping-zones.json   → 配送地域
```

**保存先ルール:**
- **静的マスターデータ** → `data/[名前].json`

---

## 🔧 開発時の重要ファイル

### 1. サイドバーメニュー追加
**ファイル:** `components/layout/SidebarConfig.ts`
```typescript
{
  id: "new-category",
  label: "新カテゴリ",
  icon: "icon-name",
  priority: 10,
  submenu: [
    { 
      text: "新ツール", 
      link: "/tools/new-tool", 
      icon: "tool", 
      status: "ready", 
      priority: 1 
    }
  ]
}
```

### 2. Supabase接続
**ファイル:** `lib/supabase.ts`
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()
```

### 3. 環境変数
**ファイル:** `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://zdzfpucdyxdlavkgrvil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key]
EBAY_APP_ID=[key]
EBAY_CLIENT_ID=[key]
EBAY_CLIENT_SECRET=[key]
```

---

## 🎯 機能追加の手順（Gemini用）

### 新しいページを追加する場合

1. **ページファイル作成**
   ```
   app/[機能名]/page.tsx
   ```

2. **必要に応じてコンポーネント作成**
   ```
   components/features/[機能名]/
   ```

3. **サイドバーに追加**
   ```
   components/layout/SidebarConfig.ts
   ```

4. **必要に応じてDB操作追加**
   ```
   lib/supabase.ts または services/[機能名]Service.ts
   ```

5. **型定義追加**
   ```
   types/[機能名].ts
   ```

### 既存機能を修正する場合

1. **関連ファイルを特定**
   - ページ: `app/[パス]/page.tsx`
   - ロジック: `lib/` または `services/`
   - UI: `components/`
   - 型: `types/`

2. **修正範囲を確認**
   - DB変更が必要? → `database/migrations/`
   - API変更が必要? → `app/api/` または `lib/`
   - UI変更のみ? → `components/` または該当ページ

3. **関連ファイルを全て修正**

---

## 📊 主要データベーステーブル

### products_master (メインテーブル)
```sql
- id: UUID
- title: TEXT (商品名)
- price: NUMERIC (価格)
- status: TEXT (ステータス)
- ebay_category_id: TEXT
- hts_code: TEXT
- created_at: TIMESTAMPTZ
```

### hts_chapters (HTS分類)
```sql
- chapter_id: INTEGER (章番号)
- description_en: TEXT
- description_ja: TEXT
```

### ebay_categories (eBayカテゴリ)
```sql
- category_id: TEXT
- name: TEXT
- parent_id: TEXT
```

---

## 🚨 よくある問題と解決法

### 1. ページが表示されない
- **確認:** `app/[パス]/page.tsx` が存在するか
- **確認:** `'use client'` ディレクティブがあるか（クライアントコンポーネントの場合）
- **確認:** エクスポートが `export default function` になっているか

### 2. コンポーネントがimportできない
- **確認:** パスエイリアス `@/` が使えているか
- **確認:** `tsconfig.json` の `paths` 設定
```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

### 3. Supabase接続エラー
- **確認:** `.env.local` にキーが設定されているか
- **確認:** `lib/supabase.ts` を使用しているか
- **確認:** RLSポリシーが設定されているか

### 4. Firebase依存のツール
- **状況:** 一部のツール（25個）はFirebase形式
- **対処:** `docs/FIREBASE_TO_SUPABASE.md` を参照してSupabaseに変換

---

## 📝 コーディング規約

### ファイル命名
- **コンポーネント:** PascalCase (`ProductCard.tsx`)
- **ユーティリティ:** camelCase (`utils.ts`)
- **ページ:** `page.tsx` (固定)
- **API:** `route.ts` (固定)

### インポート順序
```typescript
// 1. React/Next.js
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. 外部ライブラリ
import { Card } from '@/components/ui/card'

// 3. 内部モジュール
import { supabase } from '@/lib/supabase'
import { Product } from '@/types/product'

// 4. スタイル
import './styles.css'
```

### 非同期処理
```typescript
// ✅ Good: async/await
const data = await supabase.from('products').select('*')

// ❌ Bad: .then()チェーン
supabase.from('products').select('*').then(...)
```

---

## 🎯 Gemini開発時のチェックリスト

### 新機能開発
- [ ] `app/` に適切なページファイルを配置
- [ ] 必要なコンポーネントを `components/` に作成
- [ ] ビジネスロジックを `lib/` または `services/` に配置
- [ ] 型定義を `types/` に追加
- [ ] `SidebarConfig.ts` にメニュー追加
- [ ] DB変更がある場合は `database/migrations/` に追加

### 既存機能修正
- [ ] 関連ファイルを全て特定
- [ ] 型定義の変更を確認
- [ ] DB変更の必要性を確認
- [ ] テストが必要な範囲を確認

### コードレビュー
- [ ] TypeScriptエラーがないか
- [ ] インポート順序が正しいか
- [ ] 'use client'が必要な場所にあるか
- [ ] エラーハンドリングがあるか
