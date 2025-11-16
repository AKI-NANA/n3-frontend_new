export const FOLDER_DOC = `# n3-frontend プロジェクト構造ガイド

## 📁 フォルダ構成と役割

### \`/app\` - Next.js Pages & API Routes
**役割**: アプリケーションのページとAPIエンドポイント
**修正が必要な時**:
- 新しいページを追加する時
- 新しいAPIエンドポイントを追加する時
- ルーティングを変更する時

**主要ファイル**:
- \`app/page.tsx\` - トップページ
- \`app/layout.tsx\` - 全ページ共通レイアウト
- \`app/tools/\` - 各ツールのページ
- \`app/api/\` - APIエンドポイント

---

### \`/components\` - React Components
**役割**: 再利用可能なUIコンポーネント
**修正が必要な時**:
- UIデザインを変更する時
- 新しいコンポーネントを追加する時
- 既存コンポーネントの機能を拡張する時

**主要サブフォルダ**:
- \`components/ui/\` - shadcn/uiの基本コンポーネント
- \`components/layout/\` - レイアウト関連（サイドバー、ヘッダー等）
- \`components/editing/\` - データ編集関連コンポーネント

**特に重要なファイル**:
- \`components/layout/SidebarConfig.ts\` - **サイドバーの全ツール定義**
  - ここを修正すると自動的にサイドバーとツール判定に反映される

---

## 🎨 CSSとデザインの統一

### デザインシステム
このプロジェクトは **Tailwind CSS** と **shadcn/ui** を使用

#### 色の統一
\`\`\`tsx
// プライマリカラー
className="bg-blue-600 text-white hover:bg-blue-700"

// 成功
className="bg-green-600 text-white hover:bg-green-700"

// 警告
className="bg-amber-600 text-white hover:bg-amber-700"
\`\`\`

---

## 🔧 各ツールの修正方法

### サイドバーに新しいツールを追加する
**修正するファイル**: \`components/layout/SidebarConfig.ts\`

自動的に以下が更新されます:
1. サイドバーに表示される
2. Wisdom Coreのツール判定に含まれる
3. ファイルが自動的に分類される

---

### データ編集画面を修正する
**修正するファイル**:
1. \`app/tools/editing/page.tsx\` - メインページ
2. \`components/editing/\` - 編集関連コンポーネント
3. \`app/api/editing/\` - API（データ取得・保存）

**例: 原産国の表示を追加する**
1. データ構造を確認: \`types/\` フォルダ内の型定義
2. UIを修正: \`app/tools/editing/page.tsx\`
3. Excelエクスポートを修正

---

## 📋 Geminiに渡すべき情報

### ケース1: 新しい機能を追加したい
**Geminiに渡す情報**:
1. Wisdom Coreでツールをクリック → 全ファイル情報をコピー
2. このドキュメント（フォルダ構造）
3. コーディング規約ドキュメント

**質問例**:
\`\`\`
データ編集画面に原産国の表示を追加したいです。
以下のファイル一覧から、どのファイルを修正すればいいですか？

[ここにWisdom Coreからコピーしたファイル一覧を貼り付け]

また、以下のドキュメントも参照してください：
[フォルダ構造ドキュメント]
[コーディング規約ドキュメント]
\`\`\`

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
`

export const CODING_DOC = `# コーディング規約

## 🎨 スタイリング

### Tailwind CSS
このプロジェクトは **Tailwind CSS** を使用

#### 基本ルール
1. **ユーティリティクラスを使用**
\`\`\`tsx
// ✅ 推奨
<div className="flex items-center gap-2 p-4">

// ❌ 非推奨
<div style={{ display: 'flex', alignItems: 'center' }}>
\`\`\`

2. **レスポンシブデザイン**
\`\`\`tsx
<div className="w-full md:w-1/2 lg:w-1/3">
\`\`\`

3. **ホバー・フォーカス状態**
\`\`\`tsx
<button className="bg-blue-600 hover:bg-blue-700 focus:ring-2">
\`\`\`

---

### カラーパレット
\`\`\`tsx
// プライマリ（青）
bg-blue-50 / 100 / 200 / ... / 900

// セカンダリ（グレー）
bg-gray-50 / 100 / 200 / ... / 900

// 成功（緑）
bg-green-50 / 100 / 200 / ... / 900

// 警告（黄）
bg-amber-50 / 100 / 200 / ... / 900

// エラー（赤）
bg-red-50 / 100 / 200 / ... / 900
\`\`\`

---

### コンポーネント設計

#### shadcn/ui コンポーネント
\`\`\`tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
\`\`\`

#### ボタンのバリエーション
\`\`\`tsx
<Button>ボタン</Button>
<Button variant="outline">アウトライン</Button>
<Button variant="ghost">ゴースト</Button>
<Button variant="destructive">削除</Button>

<Button size="sm">小</Button>
<Button size="default">中</Button>
<Button size="lg">大</Button>
\`\`\`

---

## 📝 TypeScript

### 型定義
\`\`\`typescript
// ✅ 推奨: インターフェースを使用
interface User {
  id: number
  name: string
  email: string
}

// ✅ 推奨: ReactコンポーネントのProps
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}
\`\`\`

---

## 🗂️ ファイル構成

### ページファイル
\`\`\`tsx
// app/tools/my-tool/page.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function MyToolPage() {
  const [data, setData] = useState([])
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Tool</h1>
    </div>
  )
}
\`\`\`

### APIルート
\`\`\`typescript
// app/api/my-endpoint/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    )
  }
}
\`\`\`

---

## 🔤 命名規則

### ファイル名
kebab-case を使用
\`\`\`
✅ 推奨:
- user-profile.tsx
- api-client.ts

❌ 非推奨:
- UserProfile.tsx
- apiClient.ts
\`\`\`

### コンポーネント名
PascalCase を使用
\`\`\`typescript
export function UserProfile() { }
export function ShippingCalculator() { }
\`\`\`

### 変数名・関数名
camelCase を使用
\`\`\`typescript
const userData = {}
function calculateShipping() { }
\`\`\`

---

## 🎯 ベストプラクティス

### State管理
\`\`\`tsx
const [isLoading, setIsLoading] = useState(false)
const [data, setData] = useState<User[]>([])
\`\`\`

### エラーハンドリング
\`\`\`typescript
try {
  const result = await fetchData()
  setData(result)
} catch (error) {
  console.error('データ取得エラー:', error)
  alert('エラーが発生しました')
}
\`\`\`

### ローディング状態
\`\`\`tsx
{loading ? (
  <div className="flex items-center justify-center py-8">
    <RefreshCw className="h-6 w-6 animate-spin" />
    <span className="ml-2">読み込み中...</span>
  </div>
) : (
  <div>{/* コンテンツ */}</div>
)}
\`\`\`

---

## 📱 レスポンシブデザイン

### ブレークポイント
\`\`\`tsx
<div className="
  w-full           // モバイル: 100%幅
  md:w-1/2         // タブレット: 50%幅
  lg:w-1/3         // デスクトップ: 33%幅
">
\`\`\`

### グリッドレイアウト
\`\`\`tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card>カード1</Card>
  <Card>カード2</Card>
  <Card>カード3</Card>
  <Card>カード4</Card>
</div>
\`\`\`
`
