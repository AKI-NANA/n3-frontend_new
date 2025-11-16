# n3-frontend プロジェクト構造ガイド

## 📁 フォルダ構成と役割

### `/app` - Next.js Pages & API Routes
**役割**: アプリケーションのページとAPIエンドポイント
**修正が必要な時**:
- 新しいページを追加する時
- 新しいAPIエンドポイントを追加する時
- ルーティングを変更する時

**主要ファイル**:
- `app/page.tsx` - トップページ
- `app/layout.tsx` - 全ページ共通レイアウト
- `app/tools/` - 各ツールのページ
- `app/api/` - APIエンドポイント

---

### `/components` - React Components
**役割**: 再利用可能なUIコンポーネント
**修正が必要な時**:
- UIデザインを変更する時
- 新しいコンポーネントを追加する時
- 既存コンポーネントの機能を拡張する時

**主要サブフォルダ**:
- `components/ui/` - shadcn/uiの基本コンポーネント
- `components/layout/` - レイアウト関連（サイドバー、ヘッダー等）
- `components/editing/` - データ編集関連コンポーネント

**特に重要なファイル**:
- `components/layout/SidebarConfig.ts` - **サイドバーの全ツール定義**（ここを修正すると自動的にサイドバーとツール判定に反映される）

---

### `/lib` - Utilities & Helpers
**役割**: ユーティリティ関数、ヘルパー関数
**修正が必要な時**:
- 共通ロジックを追加する時
- APIクライアントを修正する時

---

### `/types` - TypeScript Type Definitions
**役割**: TypeScript型定義
**修正が必要な時**:
- 新しいデータ構造を追加する時
- 既存の型を変更する時

---

### `/data` - Master Data & JSON Files
**役割**: マスターデータとJSONファイル
**修正が必要な時**:
- マスターデータを更新する時

---

### `/styles` - Global Styles
**役割**: グローバルCSS
**修正が必要な時**:
- 全体的なデザインを変更する時
- テーマを変更する時

**主要ファイル**:
- `styles/globals.css` - グローバルスタイル
- `tailwind.config.js` - Tailwind CSS設定

---

## 🎨 CSSとデザインの統一

### デザインシステム

このプロジェクトは **Tailwind CSS** と **shadcn/ui** を使用しています。

#### クラス命名規則

**Tailwind CSS のユーティリティクラスを使用**:
```tsx
// ✅ 推奨
<div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow-md">

// ❌ 非推奨
<div className="custom-container">
```

#### 色の統一

```tsx
// プライマリカラー
className="bg-blue-600 text-white hover:bg-blue-700"

// セカンダリカラー
className="bg-gray-100 text-gray-800 hover:bg-gray-200"

// 成功
className="bg-green-600 text-white hover:bg-green-700"

// 警告
className="bg-amber-600 text-white hover:bg-amber-700"

// エラー
className="bg-red-600 text-white hover:bg-red-700"
```

#### コンポーネントスタイル

shadcn/ui コンポーネントを使用:
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
```

---

## 🔧 各ツールの修正方法

### サイドバーに新しいツールを追加する

**修正するファイル**: `components/layout/SidebarConfig.ts`

```typescript
export const navigationItems: NavigationItem[] = [
  // ...existing tools
  {
    id: "new-tool-category",
    label: "新しいカテゴリ",
    icon: "tool",
    priority: 20,
    submenu: [
      { 
        text: "新しいツール", 
        link: "/tools/new-tool", 
        icon: "zap", 
        status: "new",
        priority: 1
      },
    ]
  },
]
```

**自動的に以下が更新されます**:
1. サイドバーに表示される
2. Wisdom Coreのツール判定に含まれる
3. ファイルが自動的に分類される

---

### データ編集画面を修正する

**修正するファイル**:
1. `app/tools/editing/page.tsx` - メインページ
2. `components/editing/` - 編集関連コンポーネント
3. `app/api/editing/` - API（データ取得・保存）

**例: 原産国の表示を追加する**

1. **データ構造を確認**: `types/` フォルダ内の型定義
2. **UIを修正**: `app/tools/editing/page.tsx`
3. **Excelエクスポートを修正**: エクスポート処理のコード

---

### トップページのデザインを修正する

**修正するファイル**:
1. `app/page.tsx` - トップページのコンテンツ
2. `app/layout.tsx` - 全ページ共通レイアウト
3. `components/layout/` - ヘッダー、サイドバー

---

## 📋 Geminiに渡すべき情報

### ケース1: 新しい機能を追加したい

**Geminiに渡す情報**:
1. Wisdom Coreでツールをクリック → 全ファイル情報をコピー
2. `PROJECT_DOCS/FOLDER_STRUCTURE.md`（このファイル）
3. `PROJECT_DOCS/CODING_STANDARDS.md`

**質問例**:
```
データ編集画面に原産国の表示を追加したいです。
以下のファイル一覧から、どのファイルを修正すればいいですか？

[ここにWisdom Coreからコピーしたファイル一覧を貼り付け]
```

### ケース2: デザインを統一したい

**Geminiに渡す情報**:
1. `PROJECT_DOCS/CODING_STANDARDS.md`
2. 既存の類似ページのコード

**質問例**:
```
新しいページを作成していますが、既存ページとデザインを統一したいです。
どのクラス名を使えばいいですか？

参考にしたいページ: [既存ページのパス]
```

### ケース3: バグを修正したい

**Geminiに渡す情報**:
1. エラーメッセージ
2. Wisdom Coreから該当ツールのファイル一覧
3. ブラウザのコンソールログ

---

## 🚀 開発ワークフロー

### ステップ1: 問題を特定
1. Wisdom Coreを開く
2. 該当ツールをクリック（自動でファイル情報がコピーされる）

### ステップ2: Geminiに質問
1. コピーした情報を貼り付け
2. 「どのファイルを修正すればいいですか？」と質問

### ステップ3: ファイルを修正
1. Wisdom Coreのモーダルでファイルをクリック
2. コードを確認・編集
3. 保存

### ステップ4: テスト
1. 開発サーバーを再起動（必要な場合）
2. ブラウザで動作確認

---

## 📝 重要な注意事項

1. **SidebarConfig.ts を修正したら自動的に反映される**
   - サイドバー
   - Wisdom Coreのツール判定
   - ファイル分類

2. **Tailwind CSS を使う**
   - カスタムCSSは最小限に
   - ユーティリティクラスを活用

3. **shadcn/ui コンポーネントを使う**
   - 統一感のあるデザイン
   - アクセシビリティ対応済み

4. **TypeScript を使う**
   - 型安全
   - IDE補完

---

## 🔗 関連ドキュメント

- [CODING_STANDARDS.md](./CODING_STANDARDS.md) - コーディング規約
- [API_GUIDE.md](./API_GUIDE.md) - API仕様
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - データベース設計
